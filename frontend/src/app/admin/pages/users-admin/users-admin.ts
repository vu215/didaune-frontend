import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminDataService, AdminUserRow } from '../../../core/services/admin/admin-data.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './users-admin.html',
})
export class UsersAdmin {
  private adminData = inject(AdminDataService);

  rows = signal<AdminUserRow[]>([]);
  createFormOpen = signal(false);
  createName = signal('');
  createEmail = signal('');
  createRole = signal<AdminUserRow['role']>('user');
  createError = signal('');
  editModalOpen = signal(false);
  editingUserId = signal('');
  editName = signal('');
  editEmail = signal('');
  editRole = signal<AdminUserRow['role']>('user');
  editStatus = signal<AdminUserRow['status']>('active');
  editError = signal('');

  constructor() {
    this.adminData.getAdminUsers().subscribe((rows) => this.rows.set(rows));
  }

  openCreateForm() {
    this.createFormOpen.set(true);
    this.createError.set('');
  }

  closeCreateForm() {
    this.createFormOpen.set(false);
    this.createName.set('');
    this.createEmail.set('');
    this.createRole.set('user');
    this.createError.set('');
  }

  addNewUser() {
    const name = this.createName().trim();
    const email = this.createEmail().trim();

    if (!name || !email) {
      this.createError.set('Cần nhập tên và email trước khi lưu.');
      return;
    }

    const newUser: AdminUserRow = {
      id: '',
      name,
      email,
      role: this.createRole(),
      reviews: 0,
      favorites: 0,
      status: 'active',
    };
    this.adminData.addUser(newUser);
    this.closeCreateForm();
  }

  openEditModal(row: AdminUserRow) {
    this.editingUserId.set(row.id);
    this.editName.set(row.name);
    this.editEmail.set(row.email);
    this.editRole.set(row.role);
    this.editStatus.set(row.status);
    this.editError.set('');
    this.editModalOpen.set(true);
  }

  closeEditModal() {
    this.editModalOpen.set(false);
    this.editingUserId.set('');
    this.editName.set('');
    this.editEmail.set('');
    this.editRole.set('user');
    this.editStatus.set('active');
    this.editError.set('');
  }

  saveUserEdit() {
    const id = this.editingUserId();
    const name = this.editName().trim();
    const email = this.editEmail().trim();

    if (!id) {
      this.editError.set('Không xác định được người dùng cần sửa.');
      return;
    }

    if (!name || !email) {
      this.editError.set('Cần nhập tên và email trước khi lưu.');
      return;
    }

    this.adminData.updateUser({
      id,
      name,
      email,
      role: this.editRole(),
      status: this.editStatus(),
    });

    this.closeEditModal();
  }
}
