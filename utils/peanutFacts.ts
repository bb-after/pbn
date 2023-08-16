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
    "\"Goober\" is a term commonly used in the Southern U.S. to refer to peanuts. It originates from the Congo word \"nguba\"."
];

export function getRandomPeanutFact(): string {
    const randomIndex = Math.floor(Math.random() * peanutFacts.length);
    return peanutFacts[randomIndex];
}
