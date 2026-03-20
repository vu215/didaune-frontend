import { Routes } from '@angular/router';
import { Home } from './home/home';
import { List } from './list/list';
import { Favorite } from './favorite/favorite';
import { Detail } from './detail/detail';
import { Profile } from './profile/profile';
import { Reviews } from './reviews/reviews';



export const routes: Routes = [
    { path: '', component: Home, title: 'Trang chủ' },
    { path: 'list', component: List, title: 'Danh sách' },
    { path: 'favorite', component: Favorite, title: 'Yêu thích' },
    { path: 'detail/:slug', component: Detail, title: 'Chi tiết' },
    { path: 'profile', component: Profile, title: 'Hồ sơ' },
    { path: 'reviews', component: Reviews, title: 'Đánh giá' }
];
