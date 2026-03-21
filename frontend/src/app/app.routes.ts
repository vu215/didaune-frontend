import { Routes } from '@angular/router';
import { Discover } from './features/discover/discover';
import { Detail } from './features/detail/detail';
import { Favorite } from './features/favorite/favorite';
import { Home } from './features/home/home';
import { List } from './features/list/list';
import { MapPage } from './features/map-page/map-page';
import { Planner } from './features/planner/planner';
import { Profile } from './features/profile/profile';
import { Reviews } from './features/reviews/reviews';



export const routes: Routes = [
    { path: '', component: Home, title: 'Trang chủ' },
    { path: 'discover', component: Discover, title: 'Khám phá địa điểm' },
    { path: 'list', component: List, title: 'Kết quả tìm kiếm' },
    { path: 'map', component: MapPage, title: 'Bản đồ địa điểm' },
    { path: 'planner', component: Planner, title: 'Lên lịch trình AI' },
    { path: 'favorite', component: Favorite, title: 'Yêu thích' },
    { path: 'detail/:slug', component: Detail, title: 'Chi tiết' },
    { path: 'profile', component: Profile, title: 'Hồ sơ' },
    { path: 'reviews/:slug', component: Reviews, title: 'Đánh giá' },
    { path: '**', redirectTo: '' }
];
