// Determine likely gender from a name
export function determineGender(name: string): 'male' | 'female' {
  // List of common male first names
  const maleNames = [
    'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles',
    'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua',
    'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan',
    'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon',
    'benjamin', 'samuel', 'gregory', 'alexander', 'frank', 'patrick', 'raymond', 'jack', 'dennis', 'jerry'
  ];
  
  // List of common female first names
  const femaleNames = [
    'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
    'lisa', 'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'emily', 'donna', 'michelle',
    'carol', 'amanda', 'dorothy', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia',
    'kathleen', 'amy', 'angela', 'shirley', 'anna', 'ruth', 'brenda', 'pamela', 'nicole', 'katherine',
    'virginia', 'catherine', 'christine', 'debra', 'rachel', 'carolyn', 'janet', 'emma', 'maria', 'heather'
  ];
  
  // Get the first name in lowercase
  const firstName = name.split(' ')[0].toLowerCase();
  
  // Check if it's in either list
  if (maleNames.includes(firstName)) {
    return 'male';
  } else if (femaleNames.includes(firstName)) {
    return 'female';
  }
  
  // If we can't determine from the lists, use the last character as a heuristic
  // Names ending in 'a', 'e', 'i' are more commonly female
  const lastChar = firstName.slice(-1);
  if (['a', 'e', 'i'].includes(lastChar)) {
    return 'female';
  }
  
  // Default to male
  return 'male';
}

// Generate a gender-appropriate avatar URL
export function generateAvatarUrl(name: string): string {
  const gender = determineGender(name);
  
  // Use different avatar services based on gender
  if (gender === 'male') {
    // Men avatars
    return `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 99)}.jpg`;
  } else {
    // Women avatars
    return `https://randomuser.me/api/portraits/women/${Math.floor(Math.random() * 99)}.jpg`;
  }
}