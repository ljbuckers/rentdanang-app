import { post as post1 } from './blog/posts/living-in-da-nang-2026';
import { post as post2 } from './blog/posts/da-nang-apartment-costs';
import { post as post3 } from './blog/posts/best-neighborhoods-digital-nomads';
import { post as post4 } from './blog/posts/how-to-rent-da-nang-foreigner';
import { post as post5 } from './blog/posts/rental-prices-2026-guide';
import { post as post6 } from './blog/posts/relocating-to-da-nang-guide';
import { post as post7 } from './blog/posts/da-nang-vs-hoi-an-living';
import { post as post8 } from './blog/posts/vietnam-visa-options-2026';
import { post as post9 } from './blog/posts/da-nang-coworking-spaces';
import { post as post10 } from './blog/posts/is-da-nang-safe';
import { post as post11 } from './blog/posts/da-nang-food-guide';
import { post as post12 } from './blog/posts/da-nang-internet-speed';
import { post as post13 } from './blog/posts/da-nang-transportation-guide';
import { post as post14 } from './blog/posts/da-nang-healthcare-guide';
import { post as post15 } from './blog/posts/da-nang-villa-rental-guide';
import { post as post16 } from './blog/posts/da-nang-budget-rooms';
import { post as post17 } from './blog/posts/an-thuong-neighborhood-guide';
import { post as post18 } from './blog/posts/da-nang-rental-scams';
import { post as post19 } from './blog/posts/da-nang-pet-friendly-rentals';
import { post as post20 } from './blog/posts/best-time-move-da-nang';

const POSTS: Record<string, typeof post1> = {
  "best-time-move-da-nang": post20,
  "da-nang-pet-friendly-rentals": post19,
  "da-nang-rental-scams": post18,
  "an-thuong-neighborhood-guide": post17,
  "da-nang-budget-rooms": post16,
  "da-nang-villa-rental-guide": post15,
  "da-nang-healthcare-guide": post14,
  "da-nang-transportation-guide": post13,
  "da-nang-internet-speed": post12,
  "da-nang-food-guide": post11,
  "is-da-nang-safe": post10,
  "da-nang-coworking-spaces": post9,
  "vietnam-visa-options-2026": post8,
  "da-nang-vs-hoi-an-living": post7,
  "relocating-to-da-nang-guide": post6,
  "rental-prices-2026-guide": post5,
  "living-in-da-nang-2026": post1,
  "da-nang-apartment-costs": post2,
  "best-neighborhoods-digital-nomads": post3,
  "how-to-rent-da-nang-foreigner": post4
};

export function getPost(slug: string) {
  return POSTS[slug];
}

export function getAllPosts() {
  return Object.keys(POSTS).map(slug => ({
    slug,
    ...POSTS[slug]
  }));
}
