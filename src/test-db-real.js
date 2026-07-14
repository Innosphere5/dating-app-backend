import 'dotenv/config';
import { supabaseAdmin } from './config/supabase.js';

// Use a valid UUID format for testing
const testPayload = {
  id: '00000000-0000-0000-0000-000000000000',
  first_name: "Jane",
  gender: "female",
  age: 28,
  looking_for: "relationship",
  show_me: "both",
  employment_status: "employed",
  salary_range: "50000_100000",
  religion: "Christianity",
  interests: ["hiking", "music"],
  selfie_image: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  profile_images: [
    "https://res.cloudinary.com/demo/image/upload/sample1.jpg",
    "https://res.cloudinary.com/demo/image/upload/sample2.jpg"
  ],
  updated_at: new Date().toISOString()
};

async function test() {
  try {
    // Attempt to upsert this payload in the real users table
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(testPayload)
      .select();

    console.log('Result:', { data, error });
  } catch (err) {
    console.error('Unhandled script error:', err);
  }
}

test();
