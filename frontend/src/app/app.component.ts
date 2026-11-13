import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastViewportComponent } from './shared/ui.components';

@Component({
  imports: [RouterOutlet, ToastViewportComponent],
  selector: 'app-root',
  template: '<router-outlet /><app-toast-viewport />',
})
export class App {}
