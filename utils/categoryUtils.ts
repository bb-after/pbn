import axios from 'axios';

export async function getOrCreateCategory(domain: string, categoryName: string, auth: { username: string; password: string; }) {
    try {
        // Ensure we have a valid category name
        if (!categoryName || typeof categoryName !== 'string' || categoryName.trim() === '') {
            console.log('Using default category because empty category name was provided');
            return 1; // Return the ID of the default "Uncategorized" category
        }
        
        const cleanCategoryName = categoryName.trim();
        console.log(`Looking for category: "${cleanCategoryName}" on ${domain}`);
        
        try {
            // First try to get all categories without search to avoid issues
            const allCategoriesResponse = await axios.get(`${domain}/wp-json/wp/v2/categories`, {
                params: { per_page: 100 },
                auth: auth
            });
            
            // Look for an exact match (case-insensitive)
            const existingCategory = allCategoriesResponse.data.find(
                (cat: { name: string; }) => cat.name.toLowerCase() === cleanCategoryName.toLowerCase()
            );
            
            if (existingCategory) {
                console.log(`Found existing category: ${existingCategory.name} (ID: ${existingCategory.id})`);
                return existingCategory.id;
            } 
        } catch (listError: any) {
            console.log(`Couldn't fetch all categories: ${listError instanceof Error ? listError.message : 'Unknown error'}. Will try to create.`);
        }
            console.log(`Creating new category: "${cleanCategoryName}"`);
        try {
            const newCategoryResponse = await axios.post(
                `${domain}/wp-json/wp/v2/categories`, 
                { name: cleanCategoryName }, 
                { auth: auth }
            );
            
            console.log(`Created new category with ID: ${newCategoryResponse.data.id}`);
            return newCategoryResponse.data.id;
        } catch (createError: any) {
            console.error(`Failed to create category: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
            
            // If we can't create a category, use the default Uncategorized category (ID: 1)
            console.log('Falling back to default "Uncategorized" category (ID: 1)');
            return 1;
        }
    } catch (error: any) {
        console.error(`Error in getOrCreateCategory: ${error.message}`);
        // Return default category instead of throwing to prevent post failure
        return 1; // Default "Uncategorized" category ID
    }
}
