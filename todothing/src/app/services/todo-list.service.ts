import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, switchMap } from 'rxjs';
import { TodoList } from '../models/todo-list.interface';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TodoListService {
  private apiUrl = 'https://your-api-url/lists';
  private currentListSubject = new BehaviorSubject<TodoList | null>(null);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.loadLastActiveList();
  }

  private loadLastActiveList(): void {
    const lastListId = localStorage.getItem('lastActiveList');
    if (lastListId) {
      this.setCurrentList(lastListId);
    }
  }

  getCurrentList(): Observable<TodoList | null> {
    return this.currentListSubject.asObservable();
  }

  getCurrentListId(): string | null {
    return this.currentListSubject.value?.id || null;
  }

  setCurrentList(listId: string): void {
    this.http.get<TodoList>(`${this.apiUrl}/${listId}`).pipe(
      catchError(() => of(null))
    ).subscribe(list => {
      if (list) {
        this.currentListSubject.next(list);
        localStorage.setItem('lastActiveList', listId);
      }
    });
  }

  getUserLists(): Observable<TodoList[]> {
    return this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) return of([]);
        return this.http.get<TodoList[]>(`${this.apiUrl}/user/${user.guid}`).pipe(
          catchError(() => of([]))
        );
      })
    );
  }

  createList(name: string): Observable<TodoList> {
    return this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) throw new Error('No user logged in');
        const newList: Partial<TodoList> = {
          name,
          ownerGuid: user.guid,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return this.http.post<TodoList>(this.apiUrl, newList);
      })
    );
  }
}
