const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://cshubham2k5_db_user:radhey@cluster0.lzuqgkc.mongodb.net/swarnpublication?appName=Cluster0';

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true }
});

const Subject = mongoose.model('Subject', SubjectSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const count = await Subject.countDocuments();
    if (count === 0) {
      await Subject.insertMany([
        { name: 'Computer Science', slug: 'computer-science' },
        { name: 'Physics', slug: 'physics' },
        { name: 'Mathematics', slug: 'mathematics' },
        { name: 'Artificial Intelligence', slug: 'artificial-intelligence' }
      ]);
      console.log('Successfully seeded subjects');
    } else {
      console.log('Subjects already exist in the DB');
    }
    
    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seed();
