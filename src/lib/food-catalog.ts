export type FoodCategory =
  | 'cereals'
  | 'pasta'
  | 'meat'
  | 'dairy'
  | 'nuts'
  | 'dried_fruits'
  | 'sweets'
  | 'bread'
  | 'drinks'
  | 'fats'
  | 'spices'
  | 'soups'
  | 'sublimated';

export interface FoodItem {
  id: string;
  name: { uk: string; ru: string; en: string };
  category: FoodCategory;
  per100g: { calories: number; protein: number; fat: number; carbs: number };
  defaultPortion: { comfort: number; standard: number; ultralight: number };
}

export const FOOD_CATEGORY_NAMES: Record<FoodCategory, { uk: string; ru: string; en: string }> = {
  cereals: { uk: 'Крупи та каші', ru: 'Крупы и каши', en: 'Cereals & Grains' },
  pasta: { uk: 'Макаронні вироби', ru: 'Макаронные изделия', en: 'Pasta & Noodles' },
  meat: { uk: "М'ясо та риба", ru: 'Мясо и рыба', en: 'Meat & Fish' },
  dairy: { uk: 'Молочні продукти', ru: 'Молочные продукты', en: 'Dairy' },
  nuts: { uk: 'Горіхи та насіння', ru: 'Орехи и семена', en: 'Nuts & Seeds' },
  dried_fruits: { uk: 'Сухофрукти', ru: 'Сухофрукты', en: 'Dried Fruits' },
  sweets: { uk: 'Солодощі та снеки', ru: 'Сладости и снеки', en: 'Sweets & Snacks' },
  bread: { uk: 'Хліб та сухарі', ru: 'Хлеб и сухари', en: 'Bread & Crackers' },
  drinks: { uk: 'Напої', ru: 'Напитки', en: 'Drinks' },
  fats: { uk: 'Жири та олії', ru: 'Жиры и масла', en: 'Fats & Oils' },
  spices: { uk: 'Приправи та добавки', ru: 'Приправы и добавки', en: 'Spices & Additives' },
  soups: { uk: 'Супи та бобові', ru: 'Супы и бобовые', en: 'Soups & Legumes' },
  sublimated: { uk: 'Сублімати', ru: 'Сублиматы', en: 'Freeze-dried' },
};

export const FOOD_CATALOG: FoodItem[] = [
  // ── Крупи та каші ──
  { id: 'oatmeal', name: { uk: 'Вівсянка (геркулес)', ru: 'Овсянка (геркулес)', en: 'Oatmeal' }, category: 'cereals', per100g: { calories: 352, protein: 12.3, fat: 6.1, carbs: 59.5 }, defaultPortion: { comfort: 80, standard: 70, ultralight: 55 } },
  { id: 'buckwheat', name: { uk: 'Гречка', ru: 'Гречка', en: 'Buckwheat' }, category: 'cereals', per100g: { calories: 313, protein: 12.6, fat: 3.3, carbs: 62.1 }, defaultPortion: { comfort: 90, standard: 75, ultralight: 60 } },
  { id: 'rice', name: { uk: 'Рис', ru: 'Рис', en: 'Rice' }, category: 'cereals', per100g: { calories: 344, protein: 6.7, fat: 0.7, carbs: 78.9 }, defaultPortion: { comfort: 90, standard: 75, ultralight: 60 } },
  { id: 'millet', name: { uk: 'Пшоно', ru: 'Пшено', en: 'Millet' }, category: 'cereals', per100g: { calories: 348, protein: 11.5, fat: 3.3, carbs: 66.5 }, defaultPortion: { comfort: 80, standard: 70, ultralight: 55 } },
  { id: 'couscous', name: { uk: 'Кускус', ru: 'Кускус', en: 'Couscous' }, category: 'cereals', per100g: { calories: 376, protein: 12.8, fat: 0.6, carbs: 77.4 }, defaultPortion: { comfort: 85, standard: 70, ultralight: 55 } },
  { id: 'bulgur', name: { uk: 'Булгур', ru: 'Булгур', en: 'Bulgur' }, category: 'cereals', per100g: { calories: 342, protein: 12.3, fat: 1.3, carbs: 75.9 }, defaultPortion: { comfort: 85, standard: 70, ultralight: 55 } },
  { id: 'corn_grits', name: { uk: 'Кукурудзяна крупа', ru: 'Кукурузная крупа', en: 'Corn Grits' }, category: 'cereals', per100g: { calories: 328, protein: 8.3, fat: 1.2, carbs: 71 }, defaultPortion: { comfort: 80, standard: 70, ultralight: 55 } },
  { id: 'muesli', name: { uk: 'Мюслі', ru: 'Мюсли', en: 'Muesli' }, category: 'cereals', per100g: { calories: 352, protein: 9.7, fat: 7.6, carbs: 56.6 }, defaultPortion: { comfort: 80, standard: 70, ultralight: 55 } },
  { id: 'instant_oats', name: { uk: 'Вівсянка швидкого приготування', ru: 'Овсянка быстрого приготовления', en: 'Instant Oats' }, category: 'cereals', per100g: { calories: 360, protein: 11, fat: 7, carbs: 61 }, defaultPortion: { comfort: 70, standard: 60, ultralight: 50 } },
  { id: 'barley', name: { uk: 'Перловка', ru: 'Перловка', en: 'Barley' }, category: 'cereals', per100g: { calories: 315, protein: 9.3, fat: 1.1, carbs: 66.9 }, defaultPortion: { comfort: 85, standard: 70, ultralight: 55 } },

  // ── Макаронні вироби ──
  { id: 'pasta', name: { uk: 'Макарони', ru: 'Макароны', en: 'Pasta' }, category: 'pasta', per100g: { calories: 350, protein: 10.4, fat: 1.1, carbs: 71.5 }, defaultPortion: { comfort: 110, standard: 90, ultralight: 70 } },
  { id: 'instant_noodles', name: { uk: 'Локшина швидкого приготування', ru: 'Лапша быстрого приготовления', en: 'Instant Noodles' }, category: 'pasta', per100g: { calories: 440, protein: 9, fat: 17, carbs: 62 }, defaultPortion: { comfort: 90, standard: 75, ultralight: 60 } },
  { id: 'buckwheat_noodles', name: { uk: 'Гречана локшина (соба)', ru: 'Гречневая лапша (соба)', en: 'Soba Noodles' }, category: 'pasta', per100g: { calories: 348, protein: 14.7, fat: 0.9, carbs: 70.5 }, defaultPortion: { comfort: 100, standard: 85, ultralight: 65 } },
  { id: 'rice_noodles', name: { uk: 'Рисова локшина (фунчоза)', ru: 'Рисовая лапша (фунчоза)', en: 'Rice Noodles' }, category: 'pasta', per100g: { calories: 364, protein: 3.4, fat: 0.6, carbs: 81.6 }, defaultPortion: { comfort: 90, standard: 75, ultralight: 60 } },

  // ── М'ясо та риба ──
  { id: 'smoked_sausage', name: { uk: 'Сирокопчена ковбаса', ru: 'Сырокопчёная колбаса', en: 'Dry-cured Sausage' }, category: 'meat', per100g: { calories: 472, protein: 24.8, fat: 41.5, carbs: 0 }, defaultPortion: { comfort: 50, standard: 35, ultralight: 20 } },
  { id: 'salo', name: { uk: 'Сало', ru: 'Сало', en: 'Lard / Salo' }, category: 'meat', per100g: { calories: 797, protein: 1.4, fat: 89, carbs: 0 }, defaultPortion: { comfort: 40, standard: 25, ultralight: 15 } },
  { id: 'jerky', name: { uk: 'Сушене м\'ясо (джеркі)', ru: 'Сушёное мясо (джерки)', en: 'Beef Jerky' }, category: 'meat', per100g: { calories: 410, protein: 55, fat: 15, carbs: 10 }, defaultPortion: { comfort: 35, standard: 25, ultralight: 15 } },
  { id: 'canned_beef', name: { uk: 'Тушонка яловича', ru: 'Тушёнка говяжья', en: 'Canned Beef' }, category: 'meat', per100g: { calories: 214, protein: 17, fat: 17, carbs: 0 }, defaultPortion: { comfort: 80, standard: 50, ultralight: 0 } },
  { id: 'canned_pork', name: { uk: 'Тушонка свиняча', ru: 'Тушёнка свиная', en: 'Canned Pork' }, category: 'meat', per100g: { calories: 349, protein: 14.9, fat: 32.2, carbs: 0 }, defaultPortion: { comfort: 70, standard: 40, ultralight: 0 } },
  { id: 'pate', name: { uk: 'Паштет', ru: 'Паштет', en: 'Pâté' }, category: 'meat', per100g: { calories: 301, protein: 11.4, fat: 28.1, carbs: 3.4 }, defaultPortion: { comfort: 40, standard: 30, ultralight: 0 } },
  { id: 'canned_tuna', name: { uk: 'Тунець консервований', ru: 'Тунец консервированный', en: 'Canned Tuna' }, category: 'meat', per100g: { calories: 200, protein: 29, fat: 8, carbs: 0 }, defaultPortion: { comfort: 70, standard: 50, ultralight: 30 } },
  { id: 'basturma', name: { uk: 'Бастурма', ru: 'Бастурма', en: 'Basturma' }, category: 'meat', per100g: { calories: 240, protein: 33, fat: 12, carbs: 0 }, defaultPortion: { comfort: 40, standard: 30, ultralight: 20 } },
  { id: 'dried_fish', name: { uk: 'Сушена риба', ru: 'Сушёная рыба', en: 'Dried Fish' }, category: 'meat', per100g: { calories: 275, protein: 52, fat: 6, carbs: 3 }, defaultPortion: { comfort: 35, standard: 25, ultralight: 15 } },
  { id: 'pemmican', name: { uk: 'Пемікан', ru: 'Пеммикан', en: 'Pemmican' }, category: 'meat', per100g: { calories: 520, protein: 25, fat: 45, carbs: 3 }, defaultPortion: { comfort: 50, standard: 35, ultralight: 25 } },

  // ── Молочні продукти ──
  { id: 'dry_milk', name: { uk: 'Сухе молоко', ru: 'Сухое молоко', en: 'Dry Milk Powder' }, category: 'dairy', per100g: { calories: 469, protein: 24.2, fat: 25, carbs: 39.3 }, defaultPortion: { comfort: 25, standard: 20, ultralight: 15 } },
  { id: 'hard_cheese', name: { uk: 'Твердий сир', ru: 'Твёрдый сыр', en: 'Hard Cheese' }, category: 'dairy', per100g: { calories: 352, protein: 26.8, fat: 27.4, carbs: 0 }, defaultPortion: { comfort: 50, standard: 30, ultralight: 20 } },
  { id: 'processed_cheese', name: { uk: 'Плавлений сир', ru: 'Плавленый сыр', en: 'Processed Cheese' }, category: 'dairy', per100g: { calories: 257, protein: 16.8, fat: 18.8, carbs: 8 }, defaultPortion: { comfort: 40, standard: 30, ultralight: 20 } },
  { id: 'dry_cottage', name: { uk: 'Сухий творог', ru: 'Сухой творог', en: 'Dry Cottage Cheese' }, category: 'dairy', per100g: { calories: 340, protein: 60, fat: 1.5, carbs: 18 }, defaultPortion: { comfort: 30, standard: 25, ultralight: 15 } },
  { id: 'condensed_milk', name: { uk: 'Згущене молоко', ru: 'Сгущённое молоко', en: 'Condensed Milk' }, category: 'dairy', per100g: { calories: 320, protein: 7.2, fat: 8.5, carbs: 55.5 }, defaultPortion: { comfort: 30, standard: 20, ultralight: 0 } },

  // ── Горіхи та насіння ──
  { id: 'peanuts', name: { uk: 'Арахіс', ru: 'Арахис', en: 'Peanuts' }, category: 'nuts', per100g: { calories: 567, protein: 25.8, fat: 49.2, carbs: 16.1 }, defaultPortion: { comfort: 40, standard: 30, ultralight: 25 } },
  { id: 'walnuts', name: { uk: 'Волоський горіх', ru: 'Грецкий орех', en: 'Walnuts' }, category: 'nuts', per100g: { calories: 654, protein: 15.2, fat: 65.2, carbs: 13.7 }, defaultPortion: { comfort: 35, standard: 25, ultralight: 20 } },
  { id: 'almonds', name: { uk: 'Мигдаль', ru: 'Миндаль', en: 'Almonds' }, category: 'nuts', per100g: { calories: 579, protein: 21.2, fat: 49.9, carbs: 21.6 }, defaultPortion: { comfort: 35, standard: 25, ultralight: 20 } },
  { id: 'cashews', name: { uk: 'Кеш\'ю', ru: 'Кешью', en: 'Cashews' }, category: 'nuts', per100g: { calories: 553, protein: 18.2, fat: 43.8, carbs: 30.2 }, defaultPortion: { comfort: 35, standard: 25, ultralight: 20 } },
  { id: 'hazelnuts', name: { uk: 'Фундук', ru: 'Фундук', en: 'Hazelnuts' }, category: 'nuts', per100g: { calories: 628, protein: 15, fat: 61, carbs: 17 }, defaultPortion: { comfort: 30, standard: 25, ultralight: 20 } },
  { id: 'trail_mix', name: { uk: 'Горіхова суміш (трейл мікс)', ru: 'Ореховая смесь (трейл микс)', en: 'Trail Mix' }, category: 'nuts', per100g: { calories: 462, protein: 13, fat: 29, carbs: 44 }, defaultPortion: { comfort: 50, standard: 40, ultralight: 30 } },
  { id: 'peanut_butter', name: { uk: 'Арахісова паста', ru: 'Арахисовая паста', en: 'Peanut Butter' }, category: 'nuts', per100g: { calories: 588, protein: 25, fat: 50, carbs: 20 }, defaultPortion: { comfort: 30, standard: 25, ultralight: 20 } },
  { id: 'sunflower_seeds', name: { uk: 'Насіння соняшника', ru: 'Семечки подсолнуха', en: 'Sunflower Seeds' }, category: 'nuts', per100g: { calories: 578, protein: 20.7, fat: 52.9, carbs: 10.5 }, defaultPortion: { comfort: 30, standard: 25, ultralight: 20 } },

  // ── Сухофрукти ──
  { id: 'raisins', name: { uk: 'Родзинки', ru: 'Изюм', en: 'Raisins' }, category: 'dried_fruits', per100g: { calories: 299, protein: 3.1, fat: 0.6, carbs: 79.2 }, defaultPortion: { comfort: 30, standard: 20, ultralight: 15 } },
  { id: 'dried_apricots', name: { uk: 'Курага', ru: 'Курага', en: 'Dried Apricots' }, category: 'dried_fruits', per100g: { calories: 241, protein: 5.2, fat: 0.3, carbs: 51 }, defaultPortion: { comfort: 30, standard: 20, ultralight: 15 } },
  { id: 'prunes', name: { uk: 'Чорнослив', ru: 'Чернослив', en: 'Prunes' }, category: 'dried_fruits', per100g: { calories: 231, protein: 2.3, fat: 0.7, carbs: 57.5 }, defaultPortion: { comfort: 30, standard: 20, ultralight: 15 } },
  { id: 'dates', name: { uk: 'Фінікі', ru: 'Финики', en: 'Dates' }, category: 'dried_fruits', per100g: { calories: 277, protein: 1.8, fat: 0.2, carbs: 75 }, defaultPortion: { comfort: 30, standard: 20, ultralight: 15 } },
  { id: 'dried_bananas', name: { uk: 'Сушені банани', ru: 'Сушёные бананы', en: 'Dried Bananas' }, category: 'dried_fruits', per100g: { calories: 346, protein: 3.9, fat: 1.8, carbs: 78.4 }, defaultPortion: { comfort: 25, standard: 20, ultralight: 15 } },
  { id: 'dried_cranberries', name: { uk: 'Сушена журавлина', ru: 'Сушёная клюква', en: 'Dried Cranberries' }, category: 'dried_fruits', per100g: { calories: 308, protein: 0.1, fat: 1.4, carbs: 82 }, defaultPortion: { comfort: 25, standard: 20, ultralight: 15 } },
  { id: 'dried_figs', name: { uk: 'Інжир сушений', ru: 'Инжир сушёный', en: 'Dried Figs' }, category: 'dried_fruits', per100g: { calories: 257, protein: 3.1, fat: 0.8, carbs: 57.9 }, defaultPortion: { comfort: 30, standard: 20, ultralight: 15 } },

  // ── Солодощі та снеки ──
  { id: 'dark_chocolate', name: { uk: 'Шоколад чорний', ru: 'Шоколад тёмный', en: 'Dark Chocolate' }, category: 'sweets', per100g: { calories: 539, protein: 6.2, fat: 35.4, carbs: 48.2 }, defaultPortion: { comfort: 50, standard: 35, ultralight: 25 } },
  { id: 'milk_chocolate', name: { uk: 'Шоколад молочний', ru: 'Шоколад молочный', en: 'Milk Chocolate' }, category: 'sweets', per100g: { calories: 535, protein: 7.5, fat: 29.7, carbs: 59.4 }, defaultPortion: { comfort: 50, standard: 35, ultralight: 25 } },
  { id: 'halva', name: { uk: 'Халва', ru: 'Халва', en: 'Halva' }, category: 'sweets', per100g: { calories: 523, protein: 11.6, fat: 29.7, carbs: 54 }, defaultPortion: { comfort: 40, standard: 30, ultralight: 20 } },
  { id: 'kozinaki', name: { uk: 'Козинаки', ru: 'Козинаки', en: 'Nut Brittle' }, category: 'sweets', per100g: { calories: 510, protein: 11.6, fat: 26.9, carbs: 54.5 }, defaultPortion: { comfort: 40, standard: 30, ultralight: 20 } },
  { id: 'energy_bar', name: { uk: 'Енергетичний батончик', ru: 'Энергетический батончик', en: 'Energy Bar' }, category: 'sweets', per100g: { calories: 400, protein: 10, fat: 14, carbs: 60 }, defaultPortion: { comfort: 50, standard: 40, ultralight: 35 } },
  { id: 'protein_bar', name: { uk: 'Протеїновий батончик', ru: 'Протеиновый батончик', en: 'Protein Bar' }, category: 'sweets', per100g: { calories: 380, protein: 30, fat: 12, carbs: 35 }, defaultPortion: { comfort: 50, standard: 40, ultralight: 30 } },
  { id: 'cookies_galettes', name: { uk: 'Галети / печиво', ru: 'Галеты / печенье', en: 'Galettes / Cookies' }, category: 'sweets', per100g: { calories: 395, protein: 9.1, fat: 9.1, carbs: 66.4 }, defaultPortion: { comfort: 50, standard: 40, ultralight: 30 } },
  { id: 'caramel', name: { uk: 'Карамель льодяники', ru: 'Карамель леденцы', en: 'Hard Candy' }, category: 'sweets', per100g: { calories: 382, protein: 0, fat: 1, carbs: 96 }, defaultPortion: { comfort: 30, standard: 20, ultralight: 15 } },
  { id: 'sherbet', name: { uk: 'Щербет', ru: 'Щербет', en: 'Sherbet' }, category: 'sweets', per100g: { calories: 417, protein: 7.3, fat: 14.7, carbs: 66.2 }, defaultPortion: { comfort: 40, standard: 30, ultralight: 20 } },

  // ── Хліб та сухарі ──
  { id: 'crackers', name: { uk: 'Сухарі пшеничні', ru: 'Сухари пшеничные', en: 'Wheat Crackers' }, category: 'bread', per100g: { calories: 335, protein: 11.2, fat: 1.4, carbs: 72.2 }, defaultPortion: { comfort: 60, standard: 45, ultralight: 30 } },
  { id: 'crispbread', name: { uk: 'Хлібці', ru: 'Хлебцы', en: 'Crispbread' }, category: 'bread', per100g: { calories: 320, protein: 12, fat: 3, carbs: 58 }, defaultPortion: { comfort: 50, standard: 40, ultralight: 30 } },
  { id: 'lavash', name: { uk: 'Лаваш', ru: 'Лаваш', en: 'Lavash / Flatbread' }, category: 'bread', per100g: { calories: 275, protein: 9.1, fat: 1.2, carbs: 56.8 }, defaultPortion: { comfort: 60, standard: 40, ultralight: 25 } },
  { id: 'tortilla', name: { uk: 'Тортилья', ru: 'Тортилья', en: 'Tortilla' }, category: 'bread', per100g: { calories: 312, protein: 8.1, fat: 7.4, carbs: 52 }, defaultPortion: { comfort: 50, standard: 40, ultralight: 30 } },

  // ── Напої ──
  { id: 'black_tea', name: { uk: 'Чай чорний', ru: 'Чай чёрный', en: 'Black Tea' }, category: 'drinks', per100g: { calories: 140, protein: 20, fat: 5.1, carbs: 4 }, defaultPortion: { comfort: 8, standard: 6, ultralight: 5 } },
  { id: 'instant_coffee', name: { uk: 'Кава розчинна', ru: 'Кофе растворимый', en: 'Instant Coffee' }, category: 'drinks', per100g: { calories: 94, protein: 15, fat: 3.6, carbs: 7 }, defaultPortion: { comfort: 5, standard: 4, ultralight: 3 } },
  { id: 'cocoa', name: { uk: 'Какао-порошок', ru: 'Какао-порошок', en: 'Cocoa Powder' }, category: 'drinks', per100g: { calories: 374, protein: 24.2, fat: 17.5, carbs: 31.9 }, defaultPortion: { comfort: 20, standard: 15, ultralight: 10 } },
  { id: 'kissel', name: { uk: 'Кисіль (порошок)', ru: 'Кисель (порошок)', en: 'Kissel Powder' }, category: 'drinks', per100g: { calories: 350, protein: 0, fat: 0, carbs: 87 }, defaultPortion: { comfort: 25, standard: 20, ultralight: 15 } },
  { id: 'isotonic', name: { uk: 'Ізотонік (порошок)', ru: 'Изотоник (порошок)', en: 'Isotonic Powder' }, category: 'drinks', per100g: { calories: 370, protein: 0, fat: 0, carbs: 92 }, defaultPortion: { comfort: 25, standard: 20, ultralight: 15 } },

  // ── Жири та олії ──
  { id: 'vegetable_oil', name: { uk: 'Олія рослинна', ru: 'Масло растительное', en: 'Vegetable Oil' }, category: 'fats', per100g: { calories: 884, protein: 0, fat: 99.9, carbs: 0 }, defaultPortion: { comfort: 20, standard: 15, ultralight: 10 } },
  { id: 'ghee', name: { uk: 'Топлене масло', ru: 'Топлёное масло', en: 'Ghee / Clarified Butter' }, category: 'fats', per100g: { calories: 748, protein: 0.5, fat: 82.5, carbs: 0.8 }, defaultPortion: { comfort: 20, standard: 15, ultralight: 10 } },

  // ── Приправи та добавки ──
  { id: 'salt', name: { uk: 'Сіль', ru: 'Соль', en: 'Salt' }, category: 'spices', per100g: { calories: 0, protein: 0, fat: 0, carbs: 0 }, defaultPortion: { comfort: 10, standard: 8, ultralight: 5 } },
  { id: 'sugar', name: { uk: 'Цукор', ru: 'Сахар', en: 'Sugar' }, category: 'spices', per100g: { calories: 387, protein: 0, fat: 0, carbs: 99.8 }, defaultPortion: { comfort: 35, standard: 25, ultralight: 15 } },
  { id: 'instant_mash', name: { uk: 'Картопляне пюре (сухе)', ru: 'Картофельное пюре (сухое)', en: 'Instant Mash Potato' }, category: 'spices', per100g: { calories: 340, protein: 7, fat: 1, carbs: 79 }, defaultPortion: { comfort: 80, standard: 65, ultralight: 50 } },
  { id: 'tomato_paste', name: { uk: 'Томатна паста', ru: 'Томатная паста', en: 'Tomato Paste' }, category: 'spices', per100g: { calories: 82, protein: 4.8, fat: 0.5, carbs: 14.2 }, defaultPortion: { comfort: 15, standard: 10, ultralight: 5 } },
  { id: 'bouillon_cube', name: { uk: 'Бульйонний кубик', ru: 'Бульонный кубик', en: 'Bouillon Cube' }, category: 'spices', per100g: { calories: 220, protein: 15, fat: 12, carbs: 13 }, defaultPortion: { comfort: 10, standard: 10, ultralight: 5 } },
  { id: 'dried_vegetables', name: { uk: 'Сушені овочі (суміш)', ru: 'Сушёные овощи (смесь)', en: 'Dried Vegetables Mix' }, category: 'spices', per100g: { calories: 250, protein: 10, fat: 1, carbs: 55 }, defaultPortion: { comfort: 20, standard: 15, ultralight: 10 } },
  { id: 'dried_mushrooms', name: { uk: 'Сушені гриби', ru: 'Сушёные грибы', en: 'Dried Mushrooms' }, category: 'spices', per100g: { calories: 210, protein: 23, fat: 6.4, carbs: 10 }, defaultPortion: { comfort: 15, standard: 10, ultralight: 5 } },

  // ── Супи та бобові ──
  { id: 'instant_soup', name: { uk: 'Суп швидкого приготування', ru: 'Суп быстрого приготовления', en: 'Instant Soup' }, category: 'soups', per100g: { calories: 320, protein: 8, fat: 7, carbs: 55 }, defaultPortion: { comfort: 55, standard: 45, ultralight: 35 } },
  { id: 'lentils', name: { uk: 'Сочевиця', ru: 'Чечевица', en: 'Lentils' }, category: 'soups', per100g: { calories: 352, protein: 24, fat: 1.5, carbs: 53.7 }, defaultPortion: { comfort: 80, standard: 65, ultralight: 50 } },
  { id: 'split_peas', name: { uk: 'Горох', ru: 'Горох', en: 'Split Peas' }, category: 'soups', per100g: { calories: 298, protein: 20.5, fat: 2, carbs: 49.5 }, defaultPortion: { comfort: 80, standard: 65, ultralight: 50 } },
  { id: 'soup_mix', name: { uk: 'Супова суміш (суха)', ru: 'Суповая смесь (сухая)', en: 'Dry Soup Mix' }, category: 'soups', per100g: { calories: 310, protein: 10, fat: 5, carbs: 58 }, defaultPortion: { comfort: 50, standard: 40, ultralight: 30 } },

  // ── Сублімати ──
  { id: 'freeze_dried_meal', name: { uk: 'Сублімована страва (готова)', ru: 'Сублимированное блюдо (готовое)', en: 'Freeze-dried Meal' }, category: 'sublimated', per100g: { calories: 380, protein: 18, fat: 8, carbs: 58 }, defaultPortion: { comfort: 120, standard: 100, ultralight: 80 } },
  { id: 'freeze_dried_meat', name: { uk: 'Сублімоване м\'ясо', ru: 'Сублимированное мясо', en: 'Freeze-dried Meat' }, category: 'sublimated', per100g: { calories: 410, protein: 65, fat: 12, carbs: 5 }, defaultPortion: { comfort: 30, standard: 25, ultralight: 15 } },
  { id: 'freeze_dried_vegetables', name: { uk: 'Сублімовані овочі', ru: 'Сублимированные овощи', en: 'Freeze-dried Vegetables' }, category: 'sublimated', per100g: { calories: 250, protein: 10, fat: 1, carbs: 55 }, defaultPortion: { comfort: 25, standard: 20, ultralight: 15 } },
];

export function calculateNutrition(item: FoodItem, portionG: number) {
  const ratio = portionG / 100;
  return {
    calories: Math.round(item.per100g.calories * ratio),
    protein: Math.round(item.per100g.protein * ratio * 10) / 10,
    fat: Math.round(item.per100g.fat * ratio * 10) / 10,
    carbs: Math.round(item.per100g.carbs * ratio * 10) / 10,
    weight_g: portionG,
  };
}

export function getFoodItem(id: string): FoodItem | undefined {
  return FOOD_CATALOG.find((item) => item.id === id);
}

export function getFoodsByCategory(category: FoodCategory): FoodItem[] {
  return FOOD_CATALOG.filter((item) => item.category === category);
}
