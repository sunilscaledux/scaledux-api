import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const indianStates = [
  { name: 'Andhra Pradesh', code: 'AP' },
  { name: 'Arunachal Pradesh', code: 'AR' },
  { name: 'Assam', code: 'AS' },
  { name: 'Bihar', code: 'BR' },
  { name: 'Chhattisgarh', code: 'CG' },
  { name: 'Goa', code: 'GA' },
  { name: 'Gujarat', code: 'GJ' },
  { name: 'Haryana', code: 'HR' },
  { name: 'Himachal Pradesh', code: 'HP' },
  { name: 'Jharkhand', code: 'JH' },
  { name: 'Karnataka', code: 'KA' },
  { name: 'Kerala', code: 'KL' },
  { name: 'Madhya Pradesh', code: 'MP' },
  { name: 'Maharashtra', code: 'MH' },
  { name: 'Manipur', code: 'MN' },
  { name: 'Meghalaya', code: 'ML' },
  { name: 'Mizoram', code: 'MZ' },
  { name: 'Nagaland', code: 'NL' },
  { name: 'Odisha', code: 'OR' },
  { name: 'Punjab', code: 'PB' },
  { name: 'Rajasthan', code: 'RJ' },
  { name: 'Sikkim', code: 'SK' },
  { name: 'Tamil Nadu', code: 'TN' },
  { name: 'Telangana', code: 'TS' },
  { name: 'Tripura', code: 'TR' },
  { name: 'Uttar Pradesh', code: 'UP' },
  { name: 'Uttarakhand', code: 'UK' },
  { name: 'West Bengal', code: 'WB' },
  // Union Territories
  { name: 'Andaman and Nicobar Islands', code: 'AN' },
  { name: 'Chandigarh', code: 'CH' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DH' },
  { name: 'Delhi', code: 'DL' },
  { name: 'Jammu and Kashmir', code: 'JK' },
  { name: 'Ladakh', code: 'LA' },
  { name: 'Lakshadweep', code: 'LD' },
  { name: 'Puducherry', code: 'PY' }
]


const nepalStates = [
  { name: 'Koshi Province', code: 'P1' },
  { name: 'Madhesh Province', code: 'P2' },
  { name: 'Bagmati Province', code: 'P3' },
  { name: 'Gandaki Province', code: 'P4' },
  { name: 'Lumbini Province', code: 'P5' },
  { name: 'Karnali Province', code: 'P6' },
  { name: 'Sudurpashchim Province', code: 'P7' }
]

const usStates = [
  { name: 'Alabama', code: 'AL' },
  { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Delaware', code: 'DE' },
  { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' },
  { name: 'Hawaii', code: 'HI' },
  { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' },
  { name: 'Indiana', code: 'IN' },
  { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' },
  { name: 'Kentucky', code: 'KY' },
  { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' },
  { name: 'Maryland', code: 'MD' },
  { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' },
  { name: 'Minnesota', code: 'MN' },
  { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' },
  { name: 'Montana', code: 'MT' },
  { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' },
  { name: 'New Hampshire', code: 'NH' },
  { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' },
  { name: 'New York', code: 'NY' },
  { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' },
  { name: 'Ohio', code: 'OH' },
  { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' },
  { name: 'Pennsylvania', code: 'PA' },
  { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota', code: 'SD' },
  { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' },
  { name: 'Utah', code: 'UT' },
  { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' },
  { name: 'Washington', code: 'WA' },
  { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' },
  { name: 'Wyoming', code: 'WY' },
  // Federal District
  { name: 'District of Columbia', code: 'DC' }
]

const ukRegions = [
  // England
  { name: 'England', code: 'ENG' },
  // Scotland
  { name: 'Scotland', code: 'SCT' },
  // Wales
  { name: 'Wales', code: 'WLS' },
  // Northern Ireland
  { name: 'Northern Ireland', code: 'NIR' }
]

const currencies = [
  { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
  { name: 'Nepalese Rupee', code: 'NPR', symbol: 'Rs' },
  { name: 'US Dollar', code: 'USD', symbol: '$' },
  { name: 'British Pound', code: 'GBP', symbol: '£' },
  { name: 'Euro', code: 'EUR', symbol: '€' },
  { name: 'Japanese Yen', code: 'JPY', symbol: '¥' },
  { name: 'Chinese Yuan', code: 'CNY', symbol: '¥' },
  { name: 'Canadian Dollar', code: 'CAD', symbol: 'C$' },
  { name: 'Australian Dollar', code: 'AUD', symbol: 'A$' },
  { name: 'Swiss Franc', code: 'CHF', symbol: 'CHF' }
]

const nationalLanguages = [
  // Major Indian Languages
  { name: 'Hindi', native_name: 'हिन्दी', code: 'hi', country_code: 'IN' },
  { name: 'English', native_name: 'English', code: 'en', country_code: 'IN' },
  { name: 'Bengali', native_name: 'বাংলা', code: 'bn', country_code: 'IN' },
  { name: 'Telugu', native_name: 'తెలుగు', code: 'te', country_code: 'IN' },
  { name: 'Marathi', native_name: 'मराठी', code: 'mr', country_code: 'IN' },
  { name: 'Tamil', native_name: 'தமிழ்', code: 'ta', country_code: 'IN' },
  { name: 'Gujarati', native_name: 'ગુજરાતી', code: 'gu', country_code: 'IN' },
  { name: 'Urdu', native_name: 'اردو', code: 'ur', country_code: 'IN' },
  { name: 'Kannada', native_name: 'ಕನ್ನಡ', code: 'kn', country_code: 'IN' },
  { name: 'Odia', native_name: 'ଓଡ଼ିଆ', code: 'or', country_code: 'IN' },
  { name: 'Malayalam', native_name: 'മലയാളം', code: 'ml', country_code: 'IN' },
  { name: 'Punjabi', native_name: 'ਪੰਜਾਬੀ', code: 'pa', country_code: 'IN' },
  { name: 'Assamese', native_name: 'অসমীয়া', code: 'as', country_code: 'IN' },
  { name: 'Sanskrit', native_name: 'संस्कृतम्', code: 'sa', country_code: 'IN' },
  
  // Nepali
  { name: 'Nepali', native_name: 'नेपाली', code: 'ne', country_code: 'NP' },
  
  // Other major world languages
  { name: 'Chinese (Mandarin)', native_name: '中文', code: 'zh', country_code: 'CN' },
  { name: 'Spanish', native_name: 'Español', code: 'es', country_code: 'ES' },
  { name: 'French', native_name: 'Français', code: 'fr', country_code: 'FR' },
  { name: 'Arabic', native_name: 'العربية', code: 'ar', country_code: 'SA' },
  { name: 'Russian', native_name: 'Русский', code: 'ru', country_code: 'RU' },
  { name: 'Portuguese', native_name: 'Português', code: 'pt', country_code: 'PT' },
  { name: 'German', native_name: 'Deutsch', code: 'de', country_code: 'DE' },
  { name: 'Japanese', native_name: '日本語', code: 'ja', country_code: 'JP' },
  { name: 'Korean', native_name: '한국어', code: 'ko', country_code: 'KR' },
  { name: 'Italian', native_name: 'Italiano', code: 'it', country_code: 'IT' },
  { name: 'Dutch', native_name: 'Nederlands', code: 'nl', country_code: 'NL' },
  { name: 'Turkish', native_name: 'Türkçe', code: 'tr', country_code: 'TR' },
  { name: 'Persian', native_name: 'فارسی', code: 'fa', country_code: 'IR' },
  { name: 'Thai', native_name: 'ไทย', code: 'th', country_code: 'TH' },
  { name: 'Vietnamese', native_name: 'Tiếng Việt', code: 'vi', country_code: 'VN' }
]

async function main() {
  console.log('Starting seed...')

  // Create currencies first
  console.log('Creating currencies...')
  const currencyMap = new Map()
  for (const currency of currencies) {
    const createdCurrency = await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: {
        name: currency.name,
        code: currency.code,
        symbol: currency.symbol
      }
    })
    currencyMap.set(currency.code, createdCurrency)
    console.log('Created currency:', createdCurrency.name)
  }

  // Create countries with their currencies
  console.log('Creating countries...')
  
  // Create India
  const india = await prisma.country.upsert({
    where: { code: "IN" },
    update: {
      currency_id: currencyMap.get("INR").id,
      phone_code: "+91",
    },
    create: {
      name: "India",
      code: "IN",
      phone_code: "+91",
      flag: "/flags/india.svg",
      currency_id: currencyMap.get("INR").id,
    },
  });
  console.log("Created country:", india.name);

  // Create Nepal
  const nepal = await prisma.country.upsert({
    where: { code: "NP" },
    update: {
      currency_id: currencyMap.get("NPR").id,
      phone_code: "+977",
    },
    create: {
      name: "Nepal",
      code: "NP",
      phone_code: "+977",
      flag: "country/nepal.svg",
      currency_id: currencyMap.get("NPR").id,
    },
  });
  console.log('Created country:', nepal.name)

  // Create United States
  const usa = await prisma.country.upsert({
    where: { code: "US" },
    update: {
      currency_id: currencyMap.get("USD").id,
      phone_code: "+1",
    },
    create: {
      name: "United States",
      code: "US",
      phone_code: "+1",
      flag: "country/usa.svg",
      currency_id: currencyMap.get("USD").id,
    },
  });
  console.log("Created country:", usa.name);

  // Create United Kingdom
  const uk = await prisma.country.upsert({
    where: { code: "GB" },
    update: {
      currency_id: currencyMap.get("GBP").id,
      phone_code: "+44",
    },
    create: {
      name: "United Kingdom",
      code: "GB",
      phone_code: "+44",
      flag: "country/uk.svg",
      currency_id: currencyMap.get("GBP").id,
    },
  });
  console.log('Created country:', uk.name)

  // Create states for each country
  console.log('Creating states...')
  
  // Create Indian states
  for (const state of indianStates) {
    const createdState = await prisma.state.upsert({
      where: {
        name_country_id: {
          name: state.name,
          country_id: india.id
        }
      },
      update: {},
      create: {
        name: state.name,
        code: state.code,
        country_id: india.id
      }
    })
    console.log('Created Indian state:', createdState.name)
  }

  // Create Nepal states
  for (const state of nepalStates) {
    const createdState = await prisma.state.upsert({
      where: {
        name_country_id: {
          name: state.name,
          country_id: nepal.id
        }
      },
      update: {},
      create: {
        name: state.name,
        code: state.code,
        country_id: nepal.id
      }
    })
    console.log('Created Nepal state:', createdState.name)
  }

  // Create US states
  for (const state of usStates) {
    const createdState = await prisma.state.upsert({
      where: {
        name_country_id: {
          name: state.name,
          country_id: usa.id
        }
      },
      update: {},
      create: {
        name: state.name,
        code: state.code,
        country_id: usa.id
      }
    })
    console.log('Created US state:', createdState.name)
  }

  // Create UK regions
  for (const region of ukRegions) {
    const createdState = await prisma.state.upsert({
      where: {
        name_country_id: {
          name: region.name,
          country_id: uk.id
        }
      },
      update: {},
      create: {
        name: region.name,
        code: region.code,
        country_id: uk.id
      }
    })
    console.log('Created UK region:', createdState.name)
  }

  // Create languages
  for (const language of nationalLanguages) {
    const createdLanguage = await prisma.language.upsert({
      where: { code: language.code },
      update: {},
      create: {
        name: language.name,
        native_name: language.native_name,
        code: language.code,
        country_code: language.country_code,
        is_active: true
      }
    })
    console.log('Created language:', createdLanguage.name)
  }

  // Seed Expertise Categories
  console.log('Seeding expertise categories...')
  const expertiseCategories = [
    { name: 'Technology', description: 'Software development, IT, and technical skills' },
    { name: 'Design', description: 'UI/UX, graphic design, and creative skills' },
    { name: 'Marketing', description: 'Digital marketing, content, and growth strategies' },
    { name: 'Business', description: 'Strategy, operations, and management' },
    { name: 'Finance', description: 'Accounting, investment, and financial analysis' },
    { name: 'Sales', description: 'Business development and customer relations' },
    { name: 'Healthcare', description: 'Medical, nursing, and healthcare services' },
    { name: 'Education', description: 'Teaching, training, and educational content' },
    { name: 'Legal', description: 'Law, compliance, and legal services' },
    { name: 'Engineering', description: 'Mechanical, civil, and engineering disciplines' },
    { name: 'Data Science', description: 'Analytics, machine learning, and data engineering' },
    { name: 'Product Management', description: 'Product strategy and development' }
  ]

  for (const category of expertiseCategories) {
    const createdCategory = await prisma.expertiseCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category
    })
    console.log('Created expertise category:', createdCategory.name)
  }

  // Seed Specialties with Category Relations
  console.log('Seeding specialties...')
  
  // Get categories for relations
  const technologyCategory = await prisma.expertiseCategory.findUnique({ where: { name: 'Technology' } })
  const designCategory = await prisma.expertiseCategory.findUnique({ where: { name: 'Design' } })
  const marketingCategory = await prisma.expertiseCategory.findUnique({ where: { name: 'Marketing' } })
  const businessCategory = await prisma.expertiseCategory.findUnique({ where: { name: 'Business' } })
  const dataScienceCategory = await prisma.expertiseCategory.findUnique({ where: { name: 'Data Science' } })
  const financeCategory = await prisma.expertiseCategory.findUnique({ where: { name: 'Finance' } })
  const salesCategory = await prisma.expertiseCategory.findUnique({ where: { name: 'Sales' } })

  const specialtiesWithCategories = [
    // Technology Specialties
    { name: 'Frontend Development', description: 'React, Vue, Angular, HTML/CSS', expertise_category_id: technologyCategory!.id },
    { name: 'Backend Development', description: 'Node.js, Python, Java, .NET', expertise_category_id: technologyCategory!.id },
    { name: 'Mobile Development', description: 'iOS, Android, React Native, Flutter', expertise_category_id: technologyCategory!.id },
    { name: 'DevOps', description: 'CI/CD, Docker, Kubernetes, AWS', expertise_category_id: technologyCategory!.id },
    { name: 'Full Stack Development', description: 'End-to-end web development', expertise_category_id: technologyCategory!.id },
    { name: 'Database Administration', description: 'SQL, NoSQL, database optimization', expertise_category_id: technologyCategory!.id },
    { name: 'Cybersecurity', description: 'Security analysis and protection', expertise_category_id: technologyCategory!.id },
    { name: 'Cloud Computing', description: 'AWS, Azure, Google Cloud', expertise_category_id: technologyCategory!.id },
    
    // Design Specialties
    { name: 'UI Design', description: 'User interface design and prototyping', expertise_category_id: designCategory!.id },
    { name: 'UX Design', description: 'User experience research and design', expertise_category_id: designCategory!.id },
    { name: 'Graphic Design', description: 'Visual design and branding', expertise_category_id: designCategory!.id },
    { name: 'Web Design', description: 'Website design and layout', expertise_category_id: designCategory!.id },
    { name: 'Motion Graphics', description: 'Animation and video graphics', expertise_category_id: designCategory!.id },
    { name: 'Brand Design', description: 'Logo and brand identity design', expertise_category_id: designCategory!.id },
    
    // Marketing Specialties
    { name: 'Digital Marketing', description: 'Online marketing strategies', expertise_category_id: marketingCategory!.id },
    { name: 'Content Marketing', description: 'Content strategy and creation', expertise_category_id: marketingCategory!.id },
    { name: 'SEO/SEM', description: 'Search engine optimization and marketing', expertise_category_id: marketingCategory!.id },
    { name: 'Social Media Marketing', description: 'Social platform marketing', expertise_category_id: marketingCategory!.id },
    { name: 'Email Marketing', description: 'Email campaigns and automation', expertise_category_id: marketingCategory!.id },
    { name: 'Growth Hacking', description: 'Growth strategies and optimization', expertise_category_id: marketingCategory!.id },
    
    // Business Specialties
    { name: 'Business Strategy', description: 'Strategic planning and analysis', expertise_category_id: businessCategory!.id },
    { name: 'Operations Management', description: 'Process optimization and management', expertise_category_id: businessCategory!.id },
    { name: 'Project Management', description: 'Project planning and execution', expertise_category_id: businessCategory!.id },
    { name: 'Consulting', description: 'Business advisory and consulting', expertise_category_id: businessCategory!.id },
    { name: 'Entrepreneurship', description: 'Startup and business development', expertise_category_id: businessCategory!.id },
    
    // Data Science Specialties
    { name: 'Data Analysis', description: 'Statistical analysis and insights', expertise_category_id: dataScienceCategory!.id },
    { name: 'Machine Learning', description: 'ML algorithms and model development', expertise_category_id: dataScienceCategory!.id },
    { name: 'Data Engineering', description: 'Data pipeline and infrastructure', expertise_category_id: dataScienceCategory!.id },
    { name: 'Business Intelligence', description: 'BI tools and reporting', expertise_category_id: dataScienceCategory!.id },
    { name: 'Artificial Intelligence', description: 'AI development and implementation', expertise_category_id: dataScienceCategory!.id },

    // Finance Specialties
    { name: 'Financial Analysis', description: 'Financial modeling and analysis', expertise_category_id: financeCategory!.id },
    { name: 'Investment Banking', description: 'Corporate finance and M&A', expertise_category_id: financeCategory!.id },
    { name: 'Accounting', description: 'Financial reporting and compliance', expertise_category_id: financeCategory!.id },

    // Sales Specialties
    { name: 'B2B Sales', description: 'Business-to-business sales', expertise_category_id: salesCategory!.id },
    { name: 'Account Management', description: 'Client relationship management', expertise_category_id: salesCategory!.id },
    { name: 'Sales Operations', description: 'Sales process optimization', expertise_category_id: salesCategory!.id }
  ]

  for (const specialty of specialtiesWithCategories) {
    const createdSpecialty = await prisma.specialty.upsert({
      where: { 
        name_expertise_category_id: {
          name: specialty.name,
          expertise_category_id: specialty.expertise_category_id
        }
      },
      update: {},
      create: specialty
    })
    console.log('Created specialty:', createdSpecialty.name)
  }

  // Seed Skills with Category Relations
  console.log('Seeding skills...')
  
  // Get categories for relations
  const techCat = await prisma.expertiseCategory.findFirst({ where: { name: 'Technology' } })
  const designCat = await prisma.expertiseCategory.findFirst({ where: { name: 'Design' } })
  const marketingCat = await prisma.expertiseCategory.findFirst({ where: { name: 'Marketing' } })
  const dataCat = await prisma.expertiseCategory.findFirst({ where: { name: 'Data Science' } })

  const skillsWithCategories = [
    // Technology Skills
    { name: 'React', description: 'JavaScript library for building user interfaces', expertise_category_id: techCat!.id },
    { name: 'Vue.js', description: 'Progressive JavaScript framework', expertise_category_id: techCat!.id },
    { name: 'Angular', description: 'TypeScript-based web application framework', expertise_category_id: techCat!.id },
    { name: 'JavaScript', description: 'Programming language for web development', expertise_category_id: techCat!.id },
    { name: 'TypeScript', description: 'Typed superset of JavaScript', expertise_category_id: techCat!.id },
    { name: 'HTML5', description: 'Markup language for web pages', expertise_category_id: techCat!.id },
    { name: 'CSS3', description: 'Style sheet language', expertise_category_id: techCat!.id },
    { name: 'Tailwind CSS', description: 'Utility-first CSS framework', expertise_category_id: techCat!.id },
    { name: 'Node.js', description: 'JavaScript runtime for server-side development', expertise_category_id: techCat!.id },
    { name: 'Express.js', description: 'Web framework for Node.js', expertise_category_id: techCat!.id },
    { name: 'Python', description: 'High-level programming language', expertise_category_id: techCat!.id },
    { name: 'Django', description: 'Python web framework', expertise_category_id: techCat!.id },
    { name: 'Java', description: 'Object-oriented programming language', expertise_category_id: techCat!.id },
    { name: 'Spring Boot', description: 'Java framework for microservices', expertise_category_id: techCat!.id },
    { name: 'React Native', description: 'Framework for building mobile apps', expertise_category_id: techCat!.id },
    { name: 'Flutter', description: 'UI toolkit for mobile apps', expertise_category_id: techCat!.id },
    { name: 'Swift', description: 'Programming language for iOS', expertise_category_id: techCat!.id },
    { name: 'Kotlin', description: 'Programming language for Android', expertise_category_id: techCat!.id },
    { name: 'Docker', description: 'Containerization platform', expertise_category_id: techCat!.id },
    { name: 'Kubernetes', description: 'Container orchestration platform', expertise_category_id: techCat!.id },
    { name: 'AWS', description: 'Amazon Web Services cloud platform', expertise_category_id: techCat!.id },
    { name: 'Jenkins', description: 'Automation server for CI/CD', expertise_category_id: techCat!.id },

    // Design Skills
    { name: 'Figma', description: 'Design and prototyping tool', expertise_category_id: designCat!.id },
    { name: 'Adobe XD', description: 'User experience design software', expertise_category_id: designCat!.id },
    { name: 'Sketch', description: 'Digital design toolkit', expertise_category_id: designCat!.id },
    { name: 'Prototyping', description: 'Creating interactive mockups', expertise_category_id: designCat!.id },
    { name: 'User Research', description: 'Understanding user needs and behaviors', expertise_category_id: designCat!.id },
    { name: 'Wireframing', description: 'Creating structural blueprints', expertise_category_id: designCat!.id },
    { name: 'Usability Testing', description: 'Evaluating user experience', expertise_category_id: designCat!.id },
    { name: 'Information Architecture', description: 'Organizing and structuring content', expertise_category_id: designCat!.id },

    // Marketing Skills
    { name: 'Google Analytics', description: 'Web analytics service', expertise_category_id: marketingCat!.id },
    { name: 'Google Ads', description: 'Online advertising platform', expertise_category_id: marketingCat!.id },
    { name: 'Facebook Ads', description: 'Social media advertising', expertise_category_id: marketingCat!.id },
    { name: 'SEO', description: 'Search engine optimization', expertise_category_id: marketingCat!.id },

    // Data Science Skills
    { name: 'SQL', description: 'Database query language', expertise_category_id: dataCat!.id },
    { name: 'Excel', description: 'Spreadsheet application', expertise_category_id: dataCat!.id },
    { name: 'Tableau', description: 'Data visualization software', expertise_category_id: dataCat!.id },
    { name: 'Power BI', description: 'Business analytics tool', expertise_category_id: dataCat!.id },
    { name: 'TensorFlow', description: 'Machine learning framework', expertise_category_id: dataCat!.id },
    { name: 'PyTorch', description: 'Deep learning framework', expertise_category_id: dataCat!.id },
    { name: 'Pandas', description: 'Data manipulation library', expertise_category_id: dataCat!.id },
    { name: 'Scikit-learn', description: 'Machine learning library', expertise_category_id: dataCat!.id }
  ]

  for (const skill of skillsWithCategories) {
    const createdSkill = await prisma.skill.upsert({
      where: { 
        name_expertise_category_id: {
          name: skill.name,
          expertise_category_id: skill.expertise_category_id
        }
      },
      update: {},
      create: skill
    })
    console.log('Created skill:', createdSkill.name)
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
