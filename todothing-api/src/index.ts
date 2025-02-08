/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { SignJWT, jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use('*', cors());

// JWT middleware for protected routes
app.use('/api/*', jwt({
  secret: c => new TextEncoder().encode(c.env.JWT_SECRET)
}));

// Auth routes
app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first();
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const token = await new SignJWT({ sub: user.guid })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(c.env.JWT_SECRET));

  return c.json({ user, token });
});

// Todo list routes
app.get('/api/lists/user/:guid', async (c) => {
  const { guid } = c.req.param();
  const lists = await c.env.DB
    .prepare('SELECT * FROM todo_lists WHERE owner_guid = ?')
    .bind(guid)
    .all();
  return c.json(lists);
});

app.post('/api/lists', async (c) => {
  const { name, ownerGuid } = await c.req.json();
  const id = crypto.randomUUID();
  
  await c.env.DB
    .prepare('INSERT INTO todo_lists (id, name, owner_guid) VALUES (?, ?, ?)')
    .bind(id, name, ownerGuid)
    .run();
    
  const list = await c.env.DB
    .prepare('SELECT * FROM todo_lists WHERE id = ?')
    .bind(id)
    .first();
    
  return c.json(list);
});

// Todo routes
app.get('/api/todos/list/:listId', async (c) => {
  const { listId } = c.req.param();
  const todos = await c.env.DB
    .prepare('SELECT * FROM todos WHERE list_id = ?')
    .bind(listId)
    .all();
  return c.json(todos);
});

app.post('/api/todos', async (c) => {
  const { listId, title } = await c.req.json();
  
  const result = await c.env.DB
    .prepare('INSERT INTO todos (list_id, title) VALUES (?, ?)')
    .bind(listId, title)
    .run();
    
  const todo = await c.env.DB
    .prepare('SELECT * FROM todos WHERE id = ?')
    .bind(result.lastRowId)
    .first();
    
  return c.json(todo);
});

app.patch('/api/todos/:id', async (c) => {
  const { id } = c.req.param();
  const { completed } = await c.req.json();
  
  await c.env.DB
    .prepare('UPDATE todos SET completed = ? WHERE id = ?')
    .bind(completed, id)
    .run();
    
  const todo = await c.env.DB
    .prepare('SELECT * FROM todos WHERE id = ?')
    .bind(id)
    .first();
    
  return c.json(todo);
});

app.delete('/api/todos/:id', async (c) => {
  const { id } = c.req.param();
  await c.env.DB
    .prepare('DELETE FROM todos WHERE id = ?')
    .bind(id)
    .run();
  return c.json({ success: true });
});

export default app; 