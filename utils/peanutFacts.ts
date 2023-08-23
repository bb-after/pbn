const peanutFacts: string[] = [
    "Peanuts are not actually nuts! They belong to the legume family, which also includes beans and lentils.",
    "It takes about 540 peanuts to make a 12-ounce jar of peanut butter.",
    "Arachibutyrophobia is the fear of getting peanut butter stuck to the roof of your mouth.",
    "Two peanut farmers have been elected President of the USA: Thomas Jefferson and Jimmy Carter.",
    "The average American will eat around 3,000 peanut butter and jelly sandwiches in their lifetime.",
    "Peanuts and peanut butter are packed with over 30 essential nutrients and phytonutrients.",
    "Peanut butter was first introduced at the St. Louis World's Fair in 1904.",
    "Soldiers during WWII were the first to be introduced to the PB&J sandwich. When they came home, sales of the product soared.",
    "The world record for the most peanut butter and jelly sandwiches eaten in one minute is 6!",
    "Peanuts are sometimes called \"groundnuts\" because they grow underground.",
    "March 1st is National Peanut Butter Lover's Day.",
    "Astronaut Alan Shepard brought a peanut with him to the moon.",
    "There are six cities in the U.S. named Peanut: Peanut, California; Lower Peanut, Pennsylvania; Upper Peanut, Pennsylvania; Peanut, Pennsylvania; Peanut, Tennessee; and Peanut West Virginia.",
    "The ancient Incas used to grind peanuts to make a version of peanut butter.",
    "Peanuts are rich in monounsaturated fats, which are heart-healthy compared to saturated fats.",
    "A peanut is not a seed; it’s a legume related to beans and lentils.",
    "One acre of peanuts will make about 30,000 peanut butter sandwiches.",
    "Peanut shells are often used in the manufacture of kitty litter, wallboard, fireplace logs, paper, and animal feed.",
    "It's estimated that 10% of the U.S. population are allergic to peanuts.",
    "Historical Origins: Peanut butter and jelly sandwiches became popular during World War II as a nutritious and convenient meal option for soldiers due to their long shelf life and portability.",
    "Inventor of PB&J: Julia Davis Chandler is often credited with popularizing the idea of combining peanut butter and jelly in a sandwich. In the early 1900s, she published a series of peanut butter recipes that included jelly as a suggested pairing.",
    "Nutritional Benefits: Peanut butter is a good source of protein, healthy fats, and essential nutrients like vitamin E, magnesium, and potassium. On the other hand, jelly provides carbohydrates and natural sugars.",
    "National PB&J Day: April 2nd is celebrated as National Peanut Butter and Jelly Day in the United States, recognizing the beloved combination's cultural significance and widespread popularity.",
    "Alternative Spreads: While peanut butter is the classic choice, almond butter, cashew butter, and other nut butters are gaining popularity as alternatives. These spreads offer unique flavors and nutritional profiles.",
    "Creative Twists: People often add their own creative twists to the traditional PB&J sandwich. Some variations include using different types of bread, adding bananas or honey, and grilling the sandwich.",
    "World Record: The largest peanut butter and jelly sandwich ever made was over 1,342 feet long, created in the United States in 2002. It used around 750 pounds of peanut butter and 1440 pounds of jelly.",
    "Cultural Significance: The PB&J sandwich holds cultural significance in American cuisine and is often associated with childhood nostalgia. Many people have fond memories of enjoying these sandwiches as kids",
    "Global Variations: While the classic combination is most popular in the United States, similar combinations of nut spreads and fruit preserves can be found in other cultures around the world.",
    "Health Considerations: While delicious, peanut butter and jelly sandwiches can be calorie-dense. Opting for whole grain bread, natural nut butters without added sugars, and high-quality fruit preserves can make this classic treat a healthier option.",
];

export function getRandomPeanutFact(): string {
    const randomIndex = Math.floor(Math.random() * peanutFacts.length);
    return peanutFacts[randomIndex];
}
