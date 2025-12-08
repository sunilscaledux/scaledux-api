const { PrismaClient } = require('@prisma/client')
const { ulid } = require('ulid')

const prisma = new PrismaClient()

async function updateServicePackageUniqueIds() {
  try {
    console.log('🔄 Starting to update service package unique_ids...')
    
    // Get all service packages that don't have unique_id
    const packagesWithoutUniqueId = await prisma.servicePackage.findMany({
      where: {
        unique_id: null
      },
      select: {
        id: true,
        title: true
      }
    })
    
    console.log(`📦 Found ${packagesWithoutUniqueId.length} service packages without unique_id`)
    
    if (packagesWithoutUniqueId.length === 0) {
      console.log('✅ All service packages already have unique_id')
      return
    }
    
    // Update each package with a new ULID
    for (const pkg of packagesWithoutUniqueId) {
      const uniqueId = ulid()
      
      await prisma.servicePackage.update({
        where: { id: pkg.id },
        data: { unique_id: uniqueId }
      })
      
      console.log(`✅ Updated "${pkg.title}" with unique_id: ${uniqueId}`)
    }
    
    console.log(`🎉 Successfully updated ${packagesWithoutUniqueId.length} service packages`)
    
  } catch (error) {
    console.error('❌ Error updating service package unique_ids:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
updateServicePackageUniqueIds()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
