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
    const createdCategory = await prisma.expertiseCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category
    })
    console.log('  📂 Created expertise category:', createdCategory.name)
  }

  console.log('🎯 Seeding specialties...')
  
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
    console.log('  🎯 Created specialty:', createdSpecialty.name)
  }

  console.log('🛠️ Seeding skills...')
  
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
    console.log('  🛠️ Created skill:', createdSkill.name)
  }

  console.log('✅ Expertise seeding completed!')
}
