// Import necessary modules using ES Module syntax
import fs from 'fs'; // Node.js file system module
import { ObjectInputStream } from 'java-object-serialization';

// Specify the path to your .bm2 file
const filePath = 'PACMap2024-Zscore 3 ToxicRMA RD 25.bm2'; // Make sure this matches your file name

try {
    console.log(`Attempting to read file: ${filePath}`);
    // Read the entire file into a Node.js Buffer
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`File read successfully (${fileBuffer.length} bytes).`);

    // Create an ObjectInputStream from the buffer
    const stream = new ObjectInputStream(fileBuffer);
    console.log('ObjectInputStream created.');

    // Attempt to read the first object(s) from the stream
    console.log('Attempting to read object from stream...');
    const data = stream.readObject();

    console.log('--- Object Read Successfully ---');
    // Print the deserialized data structure
    console.dir(data, { depth: 5 }); // Adjust depth as needed

} catch (error) {
    console.error('--- An Error Occurred ---');
    console.error(error);
}