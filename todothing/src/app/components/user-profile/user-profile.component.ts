import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.interface';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile" *ngIf="user$ | async as user">
      <h2>User Profile</h2>
      <div>
        <label>User ID: </label>
        <input [(ngModel)]="newUserId" [placeholder]="user.userId">
        <button (click)="updateUserId()">Update ID</button>
      </div>
      <p>Email: {{ user.email }}</p>
      <p>GUID: {{ user.guid }}</p>
    </div>
  `,
  styles: [`
    .profile {
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }
  `]
})
export class UserProfileComponent {
  user$: Observable<User | null>;
  newUserId = '';

  constructor(private authService: AuthService) {
    this.user$ = this.authService.getCurrentUser();
  }

  updateUserId(): void {
    if (this.newUserId.trim()) {
      this.authService.updateUserId(this.newUserId).subscribe(() => {
        this.newUserId = '';
      });
    }
  }
}
