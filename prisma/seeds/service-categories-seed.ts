import { PrismaClient } from '@prisma/client'

const serviceCategoriesData = [
  {
    name: "Web Development",
    description: "Website and web application development services",
    icon: "code",
    subCategories: [
      {
        name: "Frontend Development",
        description: "User interface and client-side development",
        keywords: [
          { name: "React", popularity_score: 95 },
          { name: "Vue.js", popularity_score: 85 },
          { name: "Angular", popularity_score: 80 },
          { name: "JavaScript", popularity_score: 98 },
          { name: "TypeScript", popularity_score: 90 },
          { name: "HTML5", popularity_score: 95 },
          { name: "CSS3", popularity_score: 95 },
          { name: "Sass", popularity_score: 75 },
          { name: "Tailwind CSS", popularity_score: 88 },
          { name: "Bootstrap", popularity_score: 70 },
          { name: "Next.js", popularity_score: 92 },
          { name: "Nuxt.js", popularity_score: 75 },
          { name: "Svelte", popularity_score: 65 },
          { name: "jQuery", popularity_score: 60 },
          { name: "Webpack", popularity_score: 70 },
          { name: "Vite", popularity_score: 80 },
        ]
      },
      {
        name: "Backend Development",
        description: "Server-side and API development",
        keywords: [
          { name: "Node.js", popularity_score: 95 },
          { name: "Express.js", popularity_score: 90 },
          { name: "Python", popularity_score: 92 },
          { name: "Django", popularity_score: 85 },
          { name: "Flask", popularity_score: 75 },
          { name: "PHP", popularity_score: 80 },
          { name: "Laravel", popularity_score: 85 },
          { name: "Java", popularity_score: 88 },
          { name: "Spring Boot", popularity_score: 82 },
          { name: "C#", popularity_score: 78 },
          { name: ".NET", popularity_score: 80 },
          { name: "Ruby on Rails", popularity_score: 70 },
          { name: "Go", popularity_score: 75 },
          { name: "Rust", popularity_score: 60 },
          { name: "REST API", popularity_score: 95 },
          { name: "GraphQL", popularity_score: 85 },
        ]
      },
      {
        name: "Full Stack Development",
        description: "Complete web application development",
        keywords: [
          { name: "MERN Stack", popularity_score: 90 },
          { name: "MEAN Stack", popularity_score: 75 },
          { name: "LAMP Stack", popularity_score: 70 },
          { name: "JAMstack", popularity_score: 80 },
          { name: "Serverless", popularity_score: 85 },
          { name: "Microservices", popularity_score: 82 },
          { name: "Docker", popularity_score: 88 },
          { name: "Kubernetes", popularity_score: 75 },
          { name: "AWS", popularity_score: 90 },
          { name: "Azure", popularity_score: 80 },
          { name: "Google Cloud", popularity_score: 85 },
        ]
      }
    ]
  },
  {
    name: "Mobile Development",
    description: "Mobile application development for iOS and Android",
    icon: "smartphone",
    subCategories: [
      {
        name: "iOS Development",
        description: "Native iOS app development",
        keywords: [
          { name: "Swift", popularity_score: 95 },
          { name: "Objective-C", popularity_score: 60 },
          { name: "Xcode", popularity_score: 95 },
          { name: "UIKit", popularity_score: 90 },
          { name: "SwiftUI", popularity_score: 88 },
          { name: "Core Data", popularity_score: 80 },
          { name: "iOS SDK", popularity_score: 92 },
          { name: "App Store", popularity_score: 85 },
        ]
      },
      {
        name: "Android Development",
        description: "Native Android app development",
        keywords: [
          { name: "Kotlin", popularity_score: 92 },
          { name: "Java", popularity_score: 85 },
          { name: "Android Studio", popularity_score: 95 },
          { name: "Jetpack Compose", popularity_score: 85 },
          { name: "Android SDK", popularity_score: 90 },
          { name: "Google Play", popularity_score: 85 },
          { name: "Material Design", popularity_score: 80 },
        ]
      },
      {
        name: "Cross-Platform Development",
        description: "Multi-platform mobile app development",
        keywords: [
          { name: "React Native", popularity_score: 90 },
          { name: "Flutter", popularity_score: 88 },
          { name: "Xamarin", popularity_score: 70 },
          { name: "Ionic", popularity_score: 75 },
          { name: "Cordova", popularity_score: 60 },
          { name: "PhoneGap", popularity_score: 50 },
        ]
      }
    ]
  },
  {
    name: "Design & Creative",
    description: "Visual design and creative services",
    icon: "palette",
    subCategories: [
      {
        name: "UI/UX Design",
        description: "User interface and experience design",
        keywords: [
          { name: "Figma", popularity_score: 95 },
          { name: "Adobe XD", popularity_score: 85 },
          { name: "Sketch", popularity_score: 80 },
          { name: "Prototyping", popularity_score: 90 },
          { name: "Wireframing", popularity_score: 88 },
          { name: "User Research", popularity_score: 85 },
          { name: "Usability Testing", popularity_score: 80 },
          { name: "Design Systems", popularity_score: 88 },
          { name: "Responsive Design", popularity_score: 92 },
        ]
      },
      {
        name: "Graphic Design",
        description: "Visual communication and branding",
        keywords: [
          { name: "Adobe Photoshop", popularity_score: 95 },
          { name: "Adobe Illustrator", popularity_score: 92 },
          { name: "Adobe InDesign", popularity_score: 85 },
          { name: "Logo Design", popularity_score: 90 },
          { name: "Brand Identity", popularity_score: 88 },
          { name: "Print Design", popularity_score: 75 },
          { name: "Packaging Design", popularity_score: 70 },
        ]
      },
      {
        name: "Web Design",
        description: "Website visual design and layout",
        keywords: [
          { name: "Landing Page", popularity_score: 90 },
          { name: "Website Redesign", popularity_score: 85 },
          { name: "E-commerce Design", popularity_score: 88 },
          { name: "WordPress Design", popularity_score: 80 },
          { name: "Shopify Design", popularity_score: 82 },
        ]
      }
    ]
  },
  {
    name: "Digital Marketing",
    description: "Online marketing and promotion services",
    icon: "megaphone",
    subCategories: [
      {
        name: "SEO",
        description: "Search engine optimization",
        keywords: [
          { name: "On-Page SEO", popularity_score: 90 },
          { name: "Off-Page SEO", popularity_score: 85 },
          { name: "Technical SEO", popularity_score: 88 },
          { name: "Keyword Research", popularity_score: 92 },
          { name: "Link Building", popularity_score: 85 },
          { name: "Local SEO", popularity_score: 80 },
          { name: "SEO Audit", popularity_score: 88 },
        ]
      },
      {
        name: "Social Media Marketing",
        description: "Social media strategy and management",
        keywords: [
          { name: "Facebook Marketing", popularity_score: 85 },
          { name: "Instagram Marketing", popularity_score: 90 },
          { name: "LinkedIn Marketing", popularity_score: 80 },
          { name: "Twitter Marketing", popularity_score: 75 },
          { name: "TikTok Marketing", popularity_score: 85 },
          { name: "Social Media Strategy", popularity_score: 88 },
          { name: "Content Creation", popularity_score: 90 },
        ]
      },
      {
        name: "PPC Advertising",
        description: "Pay-per-click advertising campaigns",
        keywords: [
          { name: "Google Ads", popularity_score: 92 },
          { name: "Facebook Ads", popularity_score: 88 },
          { name: "Instagram Ads", popularity_score: 85 },
          { name: "LinkedIn Ads", popularity_score: 78 },
          { name: "Campaign Management", popularity_score: 85 },
          { name: "Ad Optimization", popularity_score: 88 },
        ]
      }
    ]
  },
  {
    name: "Data & Analytics",
    description: "Data analysis and business intelligence",
    icon: "bar-chart",
    subCategories: [
      {
        name: "Data Analysis",
        description: "Data processing and insights",
        keywords: [
          { name: "Python", popularity_score: 95 },
          { name: "R", popularity_score: 85 },
          { name: "SQL", popularity_score: 92 },
          { name: "Excel", popularity_score: 88 },
          { name: "Pandas", popularity_score: 90 },
          { name: "NumPy", popularity_score: 85 },
          { name: "Data Visualization", popularity_score: 88 },
        ]
      },
      {
        name: "Machine Learning",
        description: "AI and machine learning solutions",
        keywords: [
          { name: "TensorFlow", popularity_score: 90 },
          { name: "PyTorch", popularity_score: 88 },
          { name: "Scikit-learn", popularity_score: 85 },
          { name: "Deep Learning", popularity_score: 88 },
          { name: "Natural Language Processing", popularity_score: 82 },
          { name: "Computer Vision", popularity_score: 80 },
        ]
      }
    ]
  }
]

export async function seedServiceCategories(prisma: PrismaClient) {
  console.log('🌱 Seeding service categories...')

  for (const categoryData of serviceCategoriesData) {
    // Create or update category
    const category = await prisma.serviceCategory.upsert({
      where: { name: categoryData.name },
      update: {
        description: categoryData.description,
        icon: categoryData.icon,
        is_active: true
      },
      create: {
        name: categoryData.name,
        description: categoryData.description,
        icon: categoryData.icon,
        is_active: true
      }
    })

    console.log(`📂 Created/Updated category: ${category.name}`)

    // Create subcategories and keywords
    for (const subCategoryData of categoryData.subCategories) {
      const subCategory = await prisma.serviceSubCategory.upsert({
        where: { 
          category_id_name: {
            category_id: category.id,
            name: subCategoryData.name
          }
        },
        update: {
          description: subCategoryData.description,
          is_active: true
        },
        create: {
          category_id: category.id,
          name: subCategoryData.name,
          description: subCategoryData.description,
          is_active: true
        }
      })

      console.log(`  📁 Created/Updated subcategory: ${subCategory.name}`)

      // Create keywords
      for (const keywordData of subCategoryData.keywords) {
        await prisma.serviceKeyword.upsert({
          where: {
            category_id_name: {
              category_id: category.id,
              name: keywordData.name
            }
          },
          update: {
            sub_category_id: subCategory.id,
            popularity_score: keywordData.popularity_score,
            is_active: true
          },
          create: {
            category_id: category.id,
            sub_category_id: subCategory.id,
            name: keywordData.name,
            popularity_score: keywordData.popularity_score,
            is_active: true
          }
        })
      }

      console.log(`    🏷️  Created/Updated ${subCategoryData.keywords.length} keywords`)
    }
  }

  const totalCategories = await prisma.serviceCategory.count()
  const totalSubCategories = await prisma.serviceSubCategory.count()
  const totalKeywords = await prisma.serviceKeyword.count()

  console.log('✅ Service categories seeding completed!')
  console.log(`📊 Total: ${totalCategories} categories, ${totalSubCategories} subcategories, ${totalKeywords} keywords`)
}

// This function will be called from the main seed file
// No need for standalone execution
