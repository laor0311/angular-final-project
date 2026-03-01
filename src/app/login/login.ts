import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';
import { UserItem, UserService } from '../services/user-service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  username = '';
  password = '';
  errorMessage = '';
  isSubmitting = false;

  constructor(
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly authSession: AuthSessionService,
  ) {}

  onSubmit(): void {
    const inputUsername = this.username.trim();
    const inputPassword = this.password;

    if (!inputUsername || !inputPassword) {
      this.errorMessage = 'Please enter username and password.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.userService.GetAllUser().subscribe({
      next: (res) => {
        const users = Array.isArray(res?.data) ? res.data : [];
        const matchedUser = this.findMatchedUser(users, inputUsername, inputPassword);

        if (!matchedUser) {
          this.errorMessage = 'Incorrect username or password.';
          return;
        }

        const status = (matchedUser.userstatus || '').trim().toLowerCase();
        if (status && status !== 'active') {
          this.errorMessage = 'This account is not active.';
          return;
        }

        this.authSession.setCurrentUser(matchedUser);
        this.router.navigate(['/posdashboard']);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Unable to login right now. Please try again.';
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }

  private findMatchedUser(users: UserItem[], username: string, password: string): UserItem | null {
    const target = username.trim().toLowerCase();
    return (
      users.find(
        (u) => u.username.trim().toLowerCase() === target && String(u.userpassword ?? '') === password,
      ) || null
    );
  }
}
