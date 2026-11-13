import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.component').then((module) => module.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell.component').then((module) => module.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'panel' },
      {
        path: 'panel',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((module) => module.DashboardComponent)
      },
      {
        path: 'inventario',
        loadComponent: () => import('./features/inventario/inventario.component').then((module) => module.InventarioComponent)
      },
      {
        path: 'proveedores',
        loadComponent: () => import('./features/proveedores/proveedores.component').then((module) => module.ProveedoresComponent)
      },
      {
        path: 'clientes',
        loadComponent: () => import('./features/clientes/clientes.component').then((module) => module.ClientesComponent)
      },
      {
        path: 'pedidos',
        loadComponent: () => import('./features/pedidos/pedidos.component').then((module) => module.PedidosComponent)
      },
      {
        path: 'facturacion',
        loadComponent: () => import('./features/facturacion/facturacion.component').then((module) => module.FacturacionComponent)
      },
      {
        path: 'prediccion',
        loadComponent: () => import('./features/prediccion/prediccion.component').then((module) => module.PrediccionComponent)
      },
      {
        path: 'configuracion',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/configuracion/configuracion.component').then((module) => module.ConfiguracionComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
