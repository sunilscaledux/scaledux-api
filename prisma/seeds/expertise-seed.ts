import { PrismaClient } from '@prisma/client'

export async function seedExpertise(prisma: PrismaClient) {
  console.log('🎯 Seeding expertise categories...')
  
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
    const createdCategory = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category
    })
    console.log('  📂 Created expertise category:', createdCategory.name)
  }

  console.log('🎯 Seeding specialties...')
  
  // Get categories for relations
  const technologyCategory = await prisma.category.findUnique({ where: { name: 'Technology' } })
  const designCategory = await prisma.category.findUnique({ where: { name: 'Design' } })
  const marketingCategory = await prisma.category.findUnique({ where: { name: 'Marketing' } })
  const businessCategory = await prisma.category.findUnique({ where: { name: 'Business' } })
  const dataScienceCategory = await prisma.category.findUnique({ where: { name: 'Data Science' } })
  const financeCategory = await prisma.category.findUnique({ where: { name: 'Finance' } })
  const salesCategory = await prisma.category.findUnique({ where: { name: 'Sales' } })

  const specialtiesWithCategories = [
    // Technology Specialties
    { name: 'Frontend Development', description: 'React, Vue, Angular, HTML/CSS', categoryId: technologyCategory!.id },
    { name: 'Backend Development', description: 'Node.js, Python, Java, .NET', categoryId: technologyCategory!.id },
    { name: 'Mobile Development', description: 'iOS, Android, React Native, Flutter', categoryId: technologyCategory!.id },
    { name: 'DevOps', description: 'CI/CD, Docker, Kubernetes, AWS', categoryId: technologyCategory!.id },
    { name: 'Full Stack Development', description: 'End-to-end web development', categoryId: technologyCategory!.id },
    { name: 'Database Administration', description: 'SQL, NoSQL, database optimization', categoryId: technologyCategory!.id },
    { name: 'Cybersecurity', description: 'Security analysis and protection', categoryId: technologyCategory!.id },
    { name: 'Cloud Computing', description: 'AWS, Azure, Google Cloud', categoryId: technologyCategory!.id },
    
    // Design Specialties
    { name: 'UI Design', description: 'User interface design and prototyping', categoryId: designCategory!.id },
    { name: 'UX Design', description: 'User experience research and design', categoryId: designCategory!.id },
    { name: 'Graphic Design', description: 'Visual design and branding', categoryId: designCategory!.id },
    { name: 'Web Design', description: 'Website design and layout', categoryId: designCategory!.id },
    { name: 'Motion Graphics', description: 'Animation and video graphics', categoryId: designCategory!.id },
    { name: 'Brand Design', description: 'Logo and brand identity design', categoryId: designCategory!.id },
    
    // Marketing Specialties
    { name: 'Digital Marketing', description: 'Online marketing strategies', categoryId: marketingCategory!.id },
    { name: 'Content Marketing', description: 'Content strategy and creation', categoryId: marketingCategory!.id },
    { name: 'SEO/SEM', description: 'Search engine optimization and marketing', categoryId: marketingCategory!.id },
    { name: 'Social Media Marketing', description: 'Social platform marketing', categoryId: marketingCategory!.id },
    { name: 'Email Marketing', description: 'Email campaigns and automation', categoryId: marketingCategory!.id },
    { name: 'Growth Hacking', description: 'Growth strategies and optimization', categoryId: marketingCategory!.id },
    
    // Business Specialties
    { name: 'Business Strategy', description: 'Strategic planning and analysis', categoryId: businessCategory!.id },
    { name: 'Operations Management', description: 'Process optimization and management', categoryId: businessCategory!.id },
    { name: 'Project Management', description: 'Project planning and execution', categoryId: businessCategory!.id },
    { name: 'Consulting', description: 'Business advisory and consulting', categoryId: businessCategory!.id },
    { name: 'Entrepreneurship', description: 'Startup and business development', categoryId: businessCategory!.id },
    
    // Data Science Specialties
    { name: 'Data Analysis', description: 'Statistical analysis and insights', categoryId: dataScienceCategory!.id },
    { name: 'Machine Learning', description: 'ML algorithms and model development', categoryId: dataScienceCategory!.id },
    { name: 'Data Engineering', description: 'Data pipeline and infrastructure', categoryId: dataScienceCategory!.id },
    { name: 'Business Intelligence', description: 'BI tools and reporting', categoryId: dataScienceCategory!.id },
    { name: 'Artificial Intelligence', description: 'AI development and implementation', categoryId: dataScienceCategory!.id },

    // Finance Specialties
    { name: 'Financial Analysis', description: 'Financial modeling and analysis', categoryId: financeCategory!.id },
    { name: 'Investment Banking', description: 'Corporate finance and M&A', categoryId: financeCategory!.id },
    { name: 'Accounting', description: 'Financial reporting and compliance', categoryId: financeCategory!.id },

    // Sales Specialties
    { name: 'B2B Sales', description: 'Business-to-business sales', categoryId: salesCategory!.id },
    { name: 'Account Management', description: 'Client relationship management', categoryId: salesCategory!.id },
    { name: 'Sales Operations', description: 'Sales process optimization', categoryId: salesCategory!.id }
  ]

  for (const specialty of specialtiesWithCategories) {
    const createdSpecialty = await prisma.subcategory.upsert({
      where: { 
        name_categoryId: {
          name: specialty.name,
          categoryId: specialty.categoryId
        }
      },
      update: {},
      create: specialty
    })
    console.log('  🎯 Created specialty:', createdSpecialty.name)
  }

  console.log('🛠️ Seeding skills...')
  
  // Get categories for relations
  const techCat = await prisma.category.findFirst({ where: { name: 'Technology' } })
  const designCat = await prisma.category.findFirst({ where: { name: 'Design' } })
  const marketingCat = await prisma.category.findFirst({ where: { name: 'Marketing' } })
  const dataCat = await prisma.category.findFirst({ where: { name: 'Data Science' } })

  const skillsWithCategories = [
    // Technology Skills
    { name: 'React', description: 'JavaScript library for building user interfaces', categoryId: techCat!.id },
    { name: 'Vue.js', description: 'Progressive JavaScript framework', categoryId: techCat!.id },
    { name: 'Angular', description: 'TypeScript-based web application framework', categoryId: techCat!.id },
    { name: 'JavaScript', description: 'Programming language for web development', categoryId: techCat!.id },
    { name: 'TypeScript', description: 'Typed superset of JavaScript', categoryId: techCat!.id },
    { name: 'HTML5', description: 'Markup language for web pages', categoryId: techCat!.id },
    { name: 'CSS3', description: 'Style sheet language', categoryId: techCat!.id },
    { name: 'Tailwind CSS', description: 'Utility-first CSS framework', categoryId: techCat!.id },
    { name: 'Node.js', description: 'JavaScript runtime for server-side development', categoryId: techCat!.id },
    { name: 'Express.js', description: 'Web framework for Node.js', categoryId: techCat!.id },
    { name: 'Python', description: 'High-level programming language', categoryId: techCat!.id },
    { name: 'Django', description: 'Python web framework', categoryId: techCat!.id },
    { name: 'Java', description: 'Object-oriented programming language', categoryId: techCat!.id },
    { name: 'Spring Boot', description: 'Java framework for microservices', categoryId: techCat!.id },
    { name: 'React Native', description: 'Framework for building mobile apps', categoryId: techCat!.id },
    { name: 'Flutter', description: 'UI toolkit for mobile apps', categoryId: techCat!.id },
    { name: 'Swift', description: 'Programming language for iOS', categoryId: techCat!.id },
    { name: 'Kotlin', description: 'Programming language for Android', categoryId: techCat!.id },
    { name: 'Docker', description: 'Containerization platform', categoryId: techCat!.id },
    { name: 'Kubernetes', description: 'Container orchestration platform', categoryId: techCat!.id },
    { name: 'AWS', description: 'Amazon Web Services cloud platform', categoryId: techCat!.id },
    { name: 'Jenkins', description: 'Automation server for CI/CD', categoryId: techCat!.id },

    // Design Skills
    { name: 'Figma', description: 'Design and prototyping tool', categoryId: designCat!.id },
    { name: 'Adobe XD', description: 'User experience design software', categoryId: designCat!.id },
    { name: 'Sketch', description: 'Digital design toolkit', categoryId: designCat!.id },
    { name: 'Prototyping', description: 'Creating interactive mockups', categoryId: designCat!.id },
    { name: 'User Research', description: 'Understanding user needs and behaviors', categoryId: designCat!.id },
    { name: 'Wireframing', description: 'Creating structural blueprints', categoryId: designCat!.id },
    { name: 'Usability Testing', description: 'Evaluating user experience', categoryId: designCat!.id },
    { name: 'Information Architecture', description: 'Organizing and structuring content', categoryId: designCat!.id },

    // Marketing Skills
    { name: 'Google Analytics', description: 'Web analytics service', categoryId: marketingCat!.id },
    { name: 'Google Ads', description: 'Online advertising platform', categoryId: marketingCat!.id },
    { name: 'Facebook Ads', description: 'Social media advertising', categoryId: marketingCat!.id },
    { name: 'SEO', description: 'Search engine optimization', categoryId: marketingCat!.id },

    // Data Science Skills
    { name: 'SQL', description: 'Database query language', categoryId: dataCat!.id },
    { name: 'Excel', description: 'Spreadsheet application', categoryId: dataCat!.id },
    { name: 'Tableau', description: 'Data visualization software', categoryId: dataCat!.id },
    { name: 'Power BI', description: 'Business analytics tool', categoryId: dataCat!.id },
    { name: 'TensorFlow', description: 'Machine learning framework', categoryId: dataCat!.id },
    { name: 'PyTorch', description: 'Deep learning framework', categoryId: dataCat!.id },
    { name: 'Pandas', description: 'Data manipulation library', categoryId: dataCat!.id },
    { name: 'Scikit-learn', description: 'Machine learning library', categoryId: dataCat!.id }
  ]

  for (const skill of skillsWithCategories) {
    const createdSkill = await prisma.skill.upsert({
      where: { 
        name_categoryId: {
          name: skill.name,
          categoryId: skill.categoryId
        }
      },
      update: {},
      create: skill
    })
    console.log('  🛠️ Created skill:', createdSkill.name)
  }

  console.log('✅ Expertise seeding completed!')
}
