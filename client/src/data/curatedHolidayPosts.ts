export interface CuratedPost {
  caption: string;
  hashtags: string[];
  imageUrl: string;
}

const HOLIDAY_IMAGES: Record<string, string> = {
  "National Pancake Day": "/images/holiday-food.png",
  "National Blueberry Pancake Day": "/images/holiday-food.png",
  "Valentines Day": "/images/holiday-valentines.png",
  "Valentine's Day": "/images/holiday-valentines.png",
  "National Pizza Day": "/images/holiday-pizza.png",
  "St. Patrick's Day": "/images/holiday-stpatricks.png",
  "St Patricks Day": "/images/holiday-stpatricks.png",
  "Mother's Day": "/images/holiday-family.png",
  "Mothers Day": "/images/holiday-family.png",
  "Father's Day": "/images/holiday-family.png",
  "Fathers Day": "/images/holiday-family.png",
  "Independence Day": "/images/holiday-patriotic.png",
  "Memorial Day": "/images/holiday-patriotic.png",
  "Labor Day": "/images/holiday-patriotic.png",
  "National Taco Day": "/images/holiday-tacos.png",
  "Cinco de Mayo": "/images/holiday-cincodemayo.png",
  "Halloween": "/images/holiday-community.png",
  "Thanksgiving": "/images/holiday-thanksgiving.png",
  "Christmas": "/images/holiday-christmas.png",
  "Christmas Eve": "/images/holiday-christmas.png",
  "Christmas Day": "/images/holiday-christmas.png",
  "New Year's Eve": "/images/holiday-newyears.png",
  "New Years Eve": "/images/holiday-newyears.png",
  "Super Bowl Sunday": "/images/holiday-sports.png",
  "National Burger Day": "/images/holiday-burger.png",
  "National Cheeseburger Day": "/images/holiday-burger.png",
  "National Hamburger Day": "/images/holiday-burger.png",
  "National Wine Day": "/images/holiday-cocktails.png",
  "National Coffee Day": "/images/holiday-coffee.png",
  "National Cappuccino Day": "/images/holiday-coffee.png",
  "National Irish Coffee Day": "/images/holiday-coffee.png",
  "National Espresso Day": "/images/holiday-coffee.png",
  "National Hot Chocolate Day": "/images/holiday-coffee.png",
  "National Ice Cream Day": "/images/holiday-icecream.png",
  "National Waiter Day": "/images/holiday-hospitality.png",
  "National Bartender Day": "/images/holiday-cocktails.png",
  "Earth Day": "/images/holiday-community.png",
  "National Frozen Food Day": "/images/holiday-frozen.png",
  "National Chocolate Cake Day": "/images/holiday-chocolate.png",
  "National Brownie Day": "/images/holiday-chocolate.png",
  "National Cocoa Day": "/images/holiday-chocolate.png",
  "National Grilled Cheese Day": "/images/holiday-grilledcheese.png",
  "National Sandwich Day": "/images/holiday-sandwich.png",
  "National Pie Day": "/images/holiday-pie.png",
  "National Margarita Day": "/images/holiday-margarita.png",
  "National Beer Day": "/images/holiday-beer.png",
  "National IPA Day": "/images/holiday-beer.png",
  "National Craft Beer Day": "/images/holiday-beer.png",
  "National Pasta Day": "/images/holiday-pasta.png",
  "National Fried Chicken Day": "/images/holiday-chicken.png",
  "National Chicken Wing Day": "/images/holiday-chicken.png",
  "National Shrimp Day": "/images/holiday-seafood.png",
  "National Lobster Day": "/images/holiday-seafood.png",
  "National Croissant Day": "/images/holiday-brunch.png",
  "National Restaurant Week": "/images/holiday-hospitality.png",
  "National Corn Dog Day": "/images/holiday-corndog.png",
  "National Pretzel Day": "/images/holiday-brunch.png",
  "National Iced Tea Day": "/images/holiday-cocktails.png",
};

const KEYWORD_IMAGE_MAP: [RegExp, string][] = [
  [/pizza/i, "/images/holiday-pizza.png"],
  [/burger|hamburger|cheeseburger/i, "/images/holiday-burger.png"],
  [/taco|mexican|enchilada/i, "/images/holiday-tacos.png"],
  [/beer|ale|lager|ipa|brew/i, "/images/holiday-beer.png"],
  [/wine|champagne|prosecco/i, "/images/holiday-cocktails.png"],
  [/margarita|tequila|cocktail/i, "/images/holiday-margarita.png"],
  [/coffee|espresso|cappuccino|latte/i, "/images/holiday-coffee.png"],
  [/chocolate|brownie|cocoa|fudge/i, "/images/holiday-chocolate.png"],
  [/ice cream|gelato|sundae|frozen/i, "/images/holiday-icecream.png"],
  [/chicken|wing/i, "/images/holiday-chicken.png"],
  [/shrimp|lobster|seafood|crab|oyster/i, "/images/holiday-seafood.png"],
  [/pasta|spaghetti|fettuccine|noodle/i, "/images/holiday-pasta.png"],
  [/sandwich|sub|hoagie|deli/i, "/images/holiday-sandwich.png"],
  [/pie|cobbler/i, "/images/holiday-pie.png"],
  [/pancake|waffle|brunch|croissant|french toast/i, "/images/holiday-brunch.png"],
  [/grilled cheese/i, "/images/holiday-grilledcheese.png"],
  [/corn dog/i, "/images/holiday-corndog.png"],
  [/patriot|independence|memorial|flag|july/i, "/images/holiday-patriotic.png"],
  [/valentine|romance|love/i, "/images/holiday-valentines.png"],
  [/patrick|irish|shamrock/i, "/images/holiday-stpatricks.png"],
  [/cinco|mayo/i, "/images/holiday-cincodemayo.png"],
  [/thanksgiving|turkey/i, "/images/holiday-thanksgiving.png"],
  [/christmas|xmas|holiday season/i, "/images/holiday-christmas.png"],
  [/new year|nye/i, "/images/holiday-newyears.png"],
  [/super bowl|football|game day/i, "/images/holiday-sports.png"],
  [/mother|father|family|parent/i, "/images/holiday-family.png"],
  [/bartender|mixolog/i, "/images/holiday-cocktails.png"],
  [/waiter|server|hospitality|restaurant week/i, "/images/holiday-hospitality.png"],
];

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  food: "/images/holiday-food.png",
  family: "/images/holiday-family.png",
  community: "/images/holiday-community.png",
  hospitality: "/images/holiday-hospitality.png",
  sports: "/images/holiday-sports.png",
};

function getHolidayImage(holidayName: string, category: string): string {
  if (HOLIDAY_IMAGES[holidayName]) {
    return HOLIDAY_IMAGES[holidayName];
  }

  for (const [pattern, imageUrl] of KEYWORD_IMAGE_MAP) {
    if (pattern.test(holidayName)) {
      return imageUrl;
    }
  }

  return CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.food;
}

const HOLIDAY_POSTS: Record<string, { caption: string; hashtags?: string[] }> = {
  "National Pancake Day": {
    caption: `It's National Pancake Day and we're flipping out! 🥞\n\nWhether you're a buttermilk classic fan or love something a little more creative, today's the day to treat yourself to a stack.\n\nSwing by for brunch and let us do the cooking — because pancakes always taste better when someone else makes them.\n\nTag your brunch crew below! 👇`,
  },
  "Valentine's Day": {
    caption: `Love is in the air — and on the menu. 💕\n\nThis Valentine's Day, skip the ordinary and give your someone special a night they'll remember. Our kitchen is pulling out all the stops with a curated experience designed for two.\n\nReservations are filling fast. Don't wait — the best tables go first.\n\nLink in bio to reserve your spot.`,
  },
  "National Pizza Day": {
    caption: `It's National Pizza Day and we're not about to let it pass quietly. 🍕\n\nOur ovens are fired up, the dough is stretched, and the cheese pull is real. Whether you're team classic margherita or you like to go bold, today belongs to you.\n\nDine in, carry out, or delivery — just don't miss it.\n\nDrop your go-to topping in the comments 👇`,
  },
  "St. Patrick's Day": {
    caption: `Happy St. Patrick's Day! ☘️\n\nGreen beer? Sure. But we're going bigger — think hearty specials, great pours, and an atmosphere that makes you want to stay all night.\n\nNo reservation needed. Just walk in, grab a seat, and raise a glass with us.\n\nSee you tonight! 🍻`,
  },
  "Mother's Day": {
    caption: `She deserves more than flowers. 💐\n\nThis Mother's Day, bring her somewhere special. A table set just for her, a meal she doesn't have to cook, and a moment she'll actually remember.\n\nWe're taking reservations now — and the best spots won't last.\n\nBook today. She's worth it.`,
  },
  "Father's Day": {
    caption: `Dad doesn't ask for much — but he deserves a great meal. 🥩\n\nThis Father's Day, skip the ties and gift cards. Bring him in for a meal he'll actually enjoy. Great food, cold drinks, zero dishes to wash.\n\nReservations open now. Let's make Dad's day.`,
  },
  "Independence Day": {
    caption: `Happy 4th of July! 🇺🇸\n\nCelebrate with cold drinks, great food, and even better company. Whether you're stopping in before the fireworks or making us your whole evening, we've got you covered.\n\nWalk-ins welcome. Patio is open. Let's celebrate together. 🎆`,
  },
  "National Taco Day": {
    caption: `It's National Taco Day and we're ALL in. 🌮\n\nCrispy, soft, loaded, simple — however you like your tacos, today is your day. Our kitchen is ready to deliver.\n\nBring your appetite. Bring your crew. Let's taco 'bout it.\n\nComment your order below 👇`,
  },
  "Halloween": {
    caption: `Something wicked this way comes... to our kitchen. 🎃\n\nHalloween night just got a whole lot tastier. Costumes encouraged, good vibes guaranteed, and our menu is hauntingly good.\n\nStop in for a bite — if you dare. 👻`,
  },
  "Thanksgiving": {
    caption: `Grateful for good food, great people, and this incredible community. 🍂\n\nThis Thanksgiving, let us take the stress off your plate (and put the turkey on it). Whether you're dining in or ordering a feast to go, we've got everything you need for a perfect holiday.\n\nPre-orders are open now — don't wait until the last minute!`,
  },
  "Christmas": {
    caption: `Merry Christmas from our family to yours. 🎄\n\nThe holidays are meant for gathering around great food with the people you love. Let us be part of your celebration this season.\n\nWarm wishes and full plates — that's our kind of holiday.\n\nHappy holidays, everyone. ❤️`,
  },
  "New Year's Eve": {
    caption: `Ring in the New Year with us! 🥂\n\nForget the crowded bars and overpriced covers. Celebrate at our place with great food, craft cocktails, and a midnight toast worth remembering.\n\nLimited spots available — reserve now before they're gone.\n\nSee you at midnight! 🎉`,
  },
  "Super Bowl Sunday": {
    caption: `Game day. Our place. Let's go. 🏈\n\nBig screens, bigger appetizers, and the coldest drinks in town. Whether you're here for the game or just the commercials, we've got a seat for you.\n\nNo cover. No hassle. Just show up hungry.\n\nWho are you rooting for? Drop it below 👇`,
  },
  "National Burger Day": {
    caption: `It's National Burger Day and our grill is working overtime. 🍔\n\nJuicy, stacked, and made the way a burger should be — no shortcuts, no compromises. Today's the day to come in and taste what we're all about.\n\nDine in or carry out. Just don't let this one pass you by.`,
  },
  "National Wine Day": {
    caption: `Pour yourself into something good. 🍷\n\nIt's National Wine Day and our wine list is ready for you. Whether you're a bold red lover or a crisp white enthusiast, we've got the perfect glass waiting.\n\nPair it with dinner and make tonight a proper celebration.\n\nWhat's your go-to pour? Tell us below 👇`,
  },
  "National Coffee Day": {
    caption: `First sip of the day hits different here. ☕\n\nHappy National Coffee Day! Whether you're fueling up for the morning rush or settling in for a long brunch, our coffee game is strong.\n\nCome grab a cup and see why our regulars keep coming back.\n\nHow do you take yours?`,
  },
  "Cinco de Mayo": {
    caption: `¡Feliz Cinco de Mayo! 🎉\n\nMargaritas are flowing, the kitchen is fired up, and the vibes are just right. Come celebrate with bold flavors, great drinks, and a night you won't forget.\n\nNo reservation needed — just bring your appetite and your crew. 🇲🇽`,
  },
  "National Ice Cream Day": {
    caption: `Scoop season is officially here. 🍦\n\nHappy National Ice Cream Day! Our dessert menu is calling your name. Whether you finish your meal with a scoop or make it the main event, today is the day to indulge.\n\nLife's too short to skip dessert.`,
  },
  "National Waiter Day": {
    caption: `Today we celebrate the heartbeat of every great restaurant — our service team. 🙌\n\nHappy National Waiter Day to the incredible people who make every guest feel welcome, remembered, and taken care of.\n\nNext time you're in, give your server a little extra love. They've earned it. ❤️`,
  },
  "National Bartender Day": {
    caption: `Raise your glass to the ones who make the magic happen behind the bar. 🍸\n\nHappy National Bartender Day! Our bartenders don't just pour drinks — they create experiences. Come say cheers to them tonight.\n\nWhat's your favorite cocktail? Let us know 👇`,
  },
  "Earth Day": {
    caption: `This planet gives us everything — including the ingredients on your plate. 🌍\n\nHappy Earth Day! We're proud to source locally, reduce waste, and cook with care for the world around us.\n\nGreat food and a better future — that's what we're about.\n\nHow are you celebrating today?`,
  },
  "Labor Day": {
    caption: `You've worked hard. You deserve a meal you didn't have to make. 💪\n\nHappy Labor Day! Come relax, unwind, and let us take care of dinner tonight. You've earned it.\n\nWalk-ins welcome all day. See you soon!`,
  },
  "National Frozen Food Day": {
    caption: `Behind every great dish is serious prep work — and yes, some of it involves our freezer. ❄️\n\nHappy National Frozen Food Day! From our house-made frozen desserts to perfectly prepped ingredients, we make freezer magic happen.\n\nCome taste the difference fresh-from-scratch makes (even when it starts frozen). 🍨`,
  },
};

function getFallbackCaption(holidayName: string, category: string, suggestedAngle?: string): string {
  const angleText = suggestedAngle ? `\n\n${suggestedAngle}` : "";

  switch (category) {
    case "food":
      return `Happy ${holidayName}! 🍽️\n\nToday calls for something special from our kitchen. We're celebrating the only way we know how — with incredible food and great company.${angleText}\n\nCome see what we've got cooking. Walk-ins welcome!\n\nTag someone who needs to know about this 👇`;
    case "family":
      return `Happy ${holidayName}! ❤️\n\nSome days are made for gathering around a great table with the people who matter most. Today is one of those days.${angleText}\n\nLet us set the table — you just bring the ones you love.\n\nReservations recommended. Link in bio.`;
    case "community":
      return `Happy ${holidayName}! 🎉\n\nThis community is everything to us. Today we celebrate together — with great food, warm hospitality, and the kind of atmosphere that makes you want to stay.${angleText}\n\nCome be part of it. We'd love to see you tonight.`;
    case "hospitality":
      return `Happy ${holidayName}! 🙌\n\nBehind every great meal is a team that pours their heart into every detail. Today we recognize the people who make hospitality an art.${angleText}\n\nCome experience what real service feels like. We'll be here.`;
    case "sports":
      return `It's ${holidayName} and we're ready! 🏆\n\nBig screens, cold drinks, and an atmosphere that makes every play feel bigger. Whether you're here for the competition or the appetizers, we've got you covered.${angleText}\n\nNo cover. Walk-ins welcome. Let's do this!`;
    default:
      return `Happy ${holidayName}! 🎊\n\nWe're celebrating today with what we do best — great food, warm hospitality, and an atmosphere you won't want to leave.${angleText}\n\nCome join us. Walk-ins always welcome.`;
  }
}

export function getCuratedPost(
  holidayName: string,
  category: string,
  suggestedAngle?: string,
  suggestedTags?: string[]
): CuratedPost {
  const known = HOLIDAY_POSTS[holidayName];
  const caption = known
    ? known.caption
    : getFallbackCaption(holidayName, category, suggestedAngle);

  const hashtags = known?.hashtags || suggestedTags || [];
  const hashtagLine = hashtags.length > 0
    ? "\n\n" + hashtags.map(t => t.startsWith("#") ? t : `#${t}`).join(" ")
    : "";

  const imageUrl = getHolidayImage(holidayName, category);

  return {
    caption: caption + hashtagLine,
    hashtags,
    imageUrl,
  };
}
