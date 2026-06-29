import 'dotenv/config';
import mongoose from 'mongoose';
import Paper from './src/models/Paper';

const samplePapers = [
    {
        title: 'Deep Learning Approaches for Medical Image Classification',
        abstract:
            'This paper explores convolutional neural networks and transfer learning techniques for detecting diseases from medical imaging datasets.',
        pdfUrl: '/papers/deep-learning-medical-imaging.pdf',
        authors: ['Dr. Ankit Sharma', 'Priya Verma'],
        subject: '664f1c2e8b9f4a0012345671',
        status: 'published',
        createdBy: '664f1c2e8b9f4a0011111111',
        slug: 'deep-learning-medical-image-classification',
        views: 245,
        downloads: 120,
        publishedAt: new Date('2025-01-15'),
    },
    {
        title: 'Blockchain-Based Secure Voting System',
        abstract:
            'A decentralized voting architecture using blockchain technology to improve transparency, integrity, and voter trust.',
        pdfUrl: '/papers/blockchain-secure-voting.pdf',
        authors: ['Rahul Meena', 'Sneha Kapoor'],
        subject: '664f1c2e8b9f4a0012345672',
        status: 'published',
        createdBy: '664f1c2e8b9f4a0011111112',
        slug: 'blockchain-based-secure-voting-system',
        views: 180,
        downloads: 95,
        publishedAt: new Date('2025-02-10'),
    },
    {
        title: 'IoT Enabled Smart Agriculture Monitoring',
        abstract:
            'This research proposes an IoT framework for real-time soil monitoring, crop health tracking, and automated irrigation.',
        pdfUrl: '/papers/iot-smart-agriculture.pdf',
        authors: ['Karan Singh', 'Aditi Joshi'],
        subject: '664f1c2e8b9f4a0012345673',
        status: 'submitted',
        createdBy: '664f1c2e8b9f4a0011111113',
        slug: 'iot-enabled-smart-agriculture-monitoring',
        views: 92,
        downloads: 40,
    },
    {
        title: 'Natural Language Processing for Chatbot Systems',
        abstract:
            'The study analyzes transformer-based NLP models for intelligent conversational AI and multilingual chatbot support.',
        pdfUrl: '/papers/nlp-chatbot-systems.pdf',
        authors: ['Neha Agarwal'],
        subject: '664f1c2e8b9f4a0012345674',
        status: 'published',
        createdBy: '664f1c2e8b9f4a0011111114',
        slug: 'natural-language-processing-chatbot-systems',
        views: 310,
        downloads: 160,
        publishedAt: new Date('2025-03-05'),
    },
    {
        title: 'Cloud Computing Resource Optimization Techniques',
        abstract:
            'An evaluation of auto-scaling and load balancing algorithms for optimizing cloud resource utilization.',
        pdfUrl: '/papers/cloud-resource-optimization.pdf',
        authors: ['Ritik Jain', 'Ananya Rao'],
        subject: '664f1c2e8b9f4a0012345675',
        status: 'draft',
        createdBy: '664f1c2e8b9f4a0011111115',
        slug: 'cloud-computing-resource-optimization-techniques',
        views: 20,
        downloads: 5,
    },
    {
        title: 'Cybersecurity Threat Detection Using AI',
        abstract:
            'Machine learning techniques are applied for anomaly detection and prevention of cyberattacks in enterprise networks.',
        pdfUrl: '/papers/ai-cybersecurity-threat-detection.pdf',
        authors: ['Sarthak Gupta', 'Riya Choudhary'],
        subject: '664f1c2e8b9f4a0012345676',
        status: 'published',
        createdBy: '664f1c2e8b9f4a0011111116',
        slug: 'cybersecurity-threat-detection-using-ai',
        views: 410,
        downloads: 220,
        publishedAt: new Date('2025-01-28'),
    },
    {
        title: 'Quantum Computing and Cryptography',
        abstract:
            'This paper discusses quantum algorithms and their implications for modern cryptographic systems.',
        pdfUrl: '/papers/quantum-computing-cryptography.pdf',
        authors: ['Aman Tiwari'],
        subject: '664f1c2e8b9f4a0012345677',
        status: 'submitted',
        createdBy: '664f1c2e8b9f4a0011111117',
        slug: 'quantum-computing-and-cryptography',
        views: 130,
        downloads: 55,
    },
    {
        title: 'Big Data Analytics in Healthcare',
        abstract:
            'A comprehensive review of big data frameworks and predictive analytics applications in healthcare systems.',
        pdfUrl: '/papers/big-data-healthcare.pdf',
        authors: ['Mehul Arora', 'Pooja Sharma'],
        subject: '664f1c2e8b9f4a0012345678',
        status: 'published',
        createdBy: '664f1c2e8b9f4a0011111118',
        slug: 'big-data-analytics-in-healthcare',
        views: 275,
        downloads: 140,
        publishedAt: new Date('2025-02-22'),
    },
    {
        title: 'Renewable Energy Forecasting Using Machine Learning',
        abstract:
            'The paper presents predictive models for solar and wind energy generation using historical climate datasets.',
        pdfUrl: '/papers/renewable-energy-forecasting.pdf',
        authors: ['Harsh Vardhan', 'Simran Kaur'],
        subject: '664f1c2e8b9f4a0012345679',
        status: 'draft',
        createdBy: '664f1c2e8b9f4a0011111119',
        slug: 'renewable-energy-forecasting-using-machine-learning',
        views: 45,
        downloads: 12,
    },
    {
        title: 'Augmented Reality Applications in Education',
        abstract:
            'This research investigates the effectiveness of augmented reality tools for interactive learning environments.',
        pdfUrl: '/papers/ar-education-applications.pdf',
        authors: ['Ishita Malhotra', 'Vikas Saini'],
        subject: '664f1c2e8b9f4a0012345680',
        status: 'published',
        createdBy: '664f1c2e8b9f4a0011111120',
        slug: 'augmented-reality-applications-in-education',
        views: 198,
        downloads: 88,
        publishedAt: new Date('2025-04-01'),
    },
];

async function seed() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) throw new Error('No MONGODB_URI in .env');

        await mongoose.connect(MONGODB_URI);
        console.log('[Seed] Connected to cluster');

        // Convert strings to object ids manually if Mongoose complains
        const formattedPapers = samplePapers.map(p => ({
            ...p,
            subject: new mongoose.Types.ObjectId(p.subject),
            createdBy: new mongoose.Types.ObjectId(p.createdBy)
        }));

        await Paper.deleteMany({});
        console.log('[Seed] Cleared existing papers');

        await Paper.insertMany(formattedPapers);
        console.log('[Seed] Successfully inserted 10 sample papers!');

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
