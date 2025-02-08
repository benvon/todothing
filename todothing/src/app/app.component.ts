import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TodoListComponent } from './components/todo-list/todo-list.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TodoListComponent, UserProfileComponent],
  template: `
    <main>
      <app-user-profile></app-user-profile>
      <app-todo-list></app-todo-list>
    </main>
  `
})
export class AppComponent {
  title = 'todothing';
}
