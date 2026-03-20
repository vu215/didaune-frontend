import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header';
import { Aside } from './aside/aside';
import { Tabbar } from './tabbar/tabbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Aside, Tabbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
