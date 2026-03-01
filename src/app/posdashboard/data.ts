import { Product } from './models';

export const PRODUCTS: Product[] = [
  { id:'cappuccino', name:'Cappuccino', priceCents: 380, category:'Coffee', image:'/img/Cappuccino.jpg', favorite:true },
  { id:'latte', name:'Latte', priceCents: 420, category:'Coffee', image:'/img/Latte.jpg', favorite:true },
  { id:'matcha', name:'Green Tea Matcha Latte', priceCents: 430, category:'Coffee', image:'/img/Green Tea Matcha Latte.jpg' },
  { id:'donut', name:'Donuts', priceCents: 249, category:'Bakery', image:'/img/Donuts.jpg' },
  { id:'muffin', name:'Chocolate Chip Muffin', priceCents: 321, category:'Bakery', image:'/img/Chocolate Chip Muffin.jpg' },
  { id:'croissant', name:'French Croissant', priceCents: 359, category:'Bakery', image:'/img/French Croissant.jpg' },
  { id:'cheesecake', name:'Philadelphia Cheesecake', priceCents: 499, category:'Desserts', image:'/img/Philadelphia Cheesecake.jpg'},
  { id:'redvelvet', name:'Red Velvet Cake', priceCents: 550, category:'Desserts', image:'/img/Red Velvet Cake.jpg' },
  { id:'pancakes', name:'Pancakes with Berries', priceCents: 695, category:'Desserts', image:'/img/Pancakes with Berries.jpg'},
  { id:'smoothie-strawberry', name:'Strawberry Smoothie', priceCents: 599, category:'Smoothies', image:'/img/Strawberry Smoothie.jpg'},
  { id:'smoothie-fruit', name:'Fruit Smoothie', priceCents: 599, category:'Smoothies', image:'/img/Fruit Smoothie.jpg' },
  { id:'ice-cream', name:'Ice Cream / Strawberry', priceCents: 400, category:'Desserts', image:'/img/Ice Cream_Strawberry.jpg'},
  { id:'burger', name:'Burger', priceCents: 899, category:'Snacks', image:'/img/Burger.jpg' },
  { id:'wrap-chicken', name:'Chicken Wrap', priceCents: 825, category:'Sandwiches', image:'/img/Chicken Wrap.jpg', favorite:true },
  { id:'jalapeno-cheddar', name:'Jalapeño Cheddar Pretzel', priceCents: 399, category:'Snacks', image:'/img/Jalape%C3%B1o Cheddar Pretzel.jpg' },
  { id:'macaron', name:'Macarons', priceCents: 599, category:'Bakery', image:'/img/Macarons.jpg'},
  { id:'salad', name:'Salad Bowl', priceCents: 725, category:'Salads', image:'/img/Salad Bowl.jpg' },
  
];
