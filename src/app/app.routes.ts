import { Routes } from '@angular/router';
import { POSDashboard } from './posdashboard/posdashboard';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { Category } from './category/category';
import { Products } from './products/products';
import { Users } from './users/users';
import { Order } from './order/order';
import { authGuard } from './guards/auth.guard';
export const routes: Routes = [
    {path: '', redirectTo: 'login', pathMatch: 'full' },
    {path: 'login', component: Login},
    {path: 'posdashboard', component: POSDashboard, canActivate: [authGuard] },
    {path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
    {path: 'category', component: Category, canActivate: [authGuard] },
    {path: 'products', component: Products, canActivate: [authGuard] },
    {path: 'users', component: Users, canActivate: [authGuard] },
    {path: 'order', component: Order, canActivate: [authGuard] },
    {path: '**', redirectTo: 'login'}
];
