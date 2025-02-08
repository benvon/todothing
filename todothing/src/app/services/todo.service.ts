import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, of, tap } from 'rxjs';
import { Todo } from '../models/todo.interface';
import { ApiService } from './api.service';
import { TodoListService } from './todo-list.service';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private todos: Todo[] = [];
  private todosSubject = new BehaviorSubject<Todo[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(
    private api: ApiService,
    private todoListService: TodoListService
  ) {
    this.todoListService.getCurrentList().subscribe(list => {
      if (list) {
        this.loadTodos(list.id);
      }
    });
  }

  private loadTodos(listId: string): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    this.api.get<Todo[]>(`/api/todos/list/${listId}`).pipe(
      catchError(error => {
        // Fallback to local storage if API fails
        const savedTodos = localStorage.getItem(`todos_list_${listId}`);
        this.errorSubject.next('Failed to load todos from server, using local data');
        return savedTodos ? of(JSON.parse(savedTodos)) : of([]);
      }),
      finalize(() => this.loadingSubject.next(false))
    ).subscribe(todos => {
      this.todos = todos;
      this.saveTodosLocally(listId);
    });
  }

  private saveTodosLocally(listId: string): void {
    localStorage.setItem(`todos_list_${listId}`, JSON.stringify(this.todos));
    this.todosSubject.next(this.todos);
  }

  getTodos(): Observable<Todo[]> {
    return this.todosSubject.asObservable();
  }

  addTodo(title: string): void {
    const listId = this.todoListService.getCurrentListId();
    if (!listId) return;

    this.errorSubject.next(null);
    const tempTodo: Partial<Todo> = {
      listId,
      title,
      completed: false,
      createdAt: new Date()
    };

    // Optimistic update
    const tempId = Date.now();
    this.todos.push({ ...tempTodo, id: tempId } as Todo);
    this.saveTodosLocally(listId);

    // API update
    this.api.post<Todo>('/api/todos', tempTodo).pipe(
      catchError(error => {
        this.errorSubject.next('Failed to save todo to server');
        return of({ ...tempTodo, id: tempId } as Todo);
      })
    ).subscribe(todo => {
      this.todos = this.todos.map(t =>
        t.id === tempId ? todo : t
      );
      this.saveTodosLocally(listId);
    });
  }

  toggleTodo(id: number): void {
    const listId = this.todoListService.getCurrentListId();
    if (!listId) return;

    // Optimistic update
    this.todos = this.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    this.saveTodosLocally(listId);

    // API update
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      this.api.patch<Todo>(`/api/todos/${id}`, { completed: todo.completed }).pipe(
        catchError(() => [todo]) // Keep optimistic update if API fails
      ).subscribe();
    }
  }

  deleteTodo(id: number): void {
    const listId = this.todoListService.getCurrentListId();
    if (!listId) return;

    // Optimistic update
    const deletedTodo = this.todos.find(t => t.id === id);
    this.todos = this.todos.filter(todo => todo.id !== id);
    this.saveTodosLocally(listId);

    // API update
    this.api.delete(`/api/todos/${id}`).pipe(
      catchError(() => {
        // Revert if API fails
        if (deletedTodo) {
          this.todos.push(deletedTodo);
          this.saveTodosLocally(listId);
        }
        return [];
      })
    ).subscribe();
  }
}
