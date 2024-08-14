import axios from 'axios';

export async function getOrCreateCategory(domain: string, categoryName: string, auth: { username: string; password: string; }) {
    try {
        // Fetch existing categories to check if the desired category already exists
        const categoriesResponse = await axios.get(`${domain}/wp-json/wp/v2/categories`, 
            { params: { search: categoryName } 
        });
        const existingCategory = categoriesResponse.data.find((cat: { name: string; }) => cat.name.toLowerCase() === categoryName.toLowerCase());

        // If the category exists, return its ID
        if (existingCategory) {
            return existingCategory.id;
        }

        // If the category doesn't exist, create it
        const newCategoryResponse = await axios.post(`${domain}/wp-json/wp/v2/categories`, { name: categoryName }, { auth });
        console.log('response???', newCategoryResponse);
        
        return newCategoryResponse.data.id;
    } catch (error) {
        console.error('Error ensuring category exists:', error);
        throw new Error('Failed to ensure category exists');
    }
}
