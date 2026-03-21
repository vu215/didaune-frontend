import { Routes } from '@angular/router';
import { Detail } from './features/detail/detail';
import { Favorite } from './features/favorite/favorite';
import { Home } from './features/home/home';
import { List } from './features/list/list';
import { Profile } from './features/profile/profile';
import { Reviews } from './features/reviews/reviews';



export const routes: Routes = [
    { path: '', component: Home, title: 'Trang chủ' },
    { path: 'list', component: List, title: 'Danh sách' },
    { path: 'favorite', component: Favorite, title: 'Yêu thích' },
    { path: 'detail/:slug', component: Detail, title: 'Chi tiết' },
    { path: 'profile', component: Profile, title: 'Hồ sơ' },
    { path: 'reviews', component: Reviews, title: 'Đánh giá' }
];
