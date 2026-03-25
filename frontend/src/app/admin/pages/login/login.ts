import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin/admin-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class AdminLogin {
  private adminAuth = inject(AdminAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = signal('admin@didaune.vn');
  password = signal('admin123');
  errorMessage = signal('');
  loading = signal(false);

  submit() {
    this.loading.set(true);
    this.errorMessage.set('');

    this.adminAuth.login(this.email(), this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') || '/admin';
        this.router.navigateByUrl(redirectTo);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          error?.error?.message ||
            error?.message ||
            'Khong the dang nhap admin luc nay.'
        );
      },
    });
  }
}
