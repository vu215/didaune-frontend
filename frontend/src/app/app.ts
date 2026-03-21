import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Aside } from './shared/ui/aside/aside';
import { Header } from './shared/ui/header/header';
import { Tabbar } from './shared/ui/tabbar/tabbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Aside, Tabbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
