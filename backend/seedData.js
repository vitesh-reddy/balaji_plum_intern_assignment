const mongoose = require('mongoose');
const Member = require('./models/Member');
require('dotenv').config();

const members = [
  {
    member_id: 'EMP001',
    name: 'Rajesh Kumar',
    join_date: new Date('2024-01-01'),
    policy_status: 'active',
    dependents: [{ name: 'Meera Kumar', relation: 'spouse', age: 32 }],
  },
  {
    member_id: 'EMP002',
    name: 'Priya Singh',
    join_date: new Date('2024-01-01'),
    policy_status: 'active',
    dependents: [],
  },
  {
    member_id: 'EMP003',
    name: 'Amit Verma',
    join_date: new Date('2024-01-01'),
    policy_status: 'active',
    dependents: [{ name: 'Ritu Verma', relation: 'spouse', age: 28 }],
  },
  {
    member_id: 'EMP004',
    name: 'Sneha Reddy',
    join_date: new Date('2024-01-01'),
    policy_status: 'active',
    dependents: [],
  },
  {
    member_id: 'EMP005',
    name: 'Vikram Joshi',
    join_date: new Date('2024-09-01'), // Recent join for waiting period test
    policy_status: 'active',
    dependents: [],
  },
  {
    member_id: 'EMP006',
    name: 'Kavita Nair',
    join_date: new Date('2024-01-01'),
    policy_status: 'active',
    dependents: [{ name: 'Arjun Nair', relation: 'son', age: 8 }],
  },
  {
    member_id: 'EMP007',
    name: 'Suresh Patil',
    join_date: new Date('2024-01-01'),
    policy_status: 'active',
    dependents: [],
  },
  {
    member_id: 'EMP008',
    name: 'Ravi Menon',
    join_date: new Date('2024-01-01'),
    policy_status: 'active',
    dependents: [],
  },
  {
    member_id: 'EMP009',
    name: 'Anita Desai',
    join_date: new Date('2024-01-01'),
    policy_status: 'active',
    dependents: [],
  },
  {
    member_id: 'EMP010',
    name: 'Deepak Shah',
    join_date: new Date('2024-01-01'),
    policy_status: 'active',
    dependents: [{ name: 'Pooja Shah', relation: 'spouse', age: 30 }],
  },
];

async function seedDatabase() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plum_opd';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for seeding...');

    // Check if members already exist
    const existingCount = await Member.countDocuments();
    if (existingCount > 0) {
      console.log(`Database already has ${existingCount} members. Skipping seed.`);
      console.log('To reseed, drop the members collection first.');
      await mongoose.disconnect();
      return;
    }

    // Insert members
    await Member.insertMany(members);
    console.log(`✅ Seeded ${members.length} members successfully!`);

    // Display seeded members
    for (const m of members) {
      console.log(`  - ${m.member_id}: ${m.name} (joined: ${m.join_date.toISOString().split('T')[0]})`);
    }

    await mongoose.disconnect();
    console.log('\nSeeding complete. Database disconnected.');
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, members };
