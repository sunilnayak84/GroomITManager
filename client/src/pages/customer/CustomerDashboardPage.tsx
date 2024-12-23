import Link from 'next/link'; // Assuming Next.js for routing, adjust as needed
import { Card, CardHeader, CardTitle, CardContent, User } from '@ui/components'; // Replace with your actual component imports

function Dashboard() {
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-4"> {/* Changed to 3 columns */}
        {/* Existing dashboard content */}

        <Link href="/customer/profile">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                My Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>View and manage your profile</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;


// Customer Profile Page (Separate Component)
import { useState } from 'react';

function CustomerProfile() {
  const [profileData, setProfileData] = useState({ name: '', email: '' }); // Placeholder data

  const handleInputChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission (e.g., API call to update profile)
    console.log('Profile data submitted:', profileData);
  };

  return (
    <div>
      <h1>Customer Profile</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input type="text" name="name" value={profileData.name} onChange={handleInputChange} />
        </label>
        <br />
        <label>
          Email:
          <input type="email" name="email" value={profileData.email} onChange={handleInputChange} />
        </label>
        <br />
        <button type="submit">Save Changes</button>
      </form>
    </div>
  );
}

export default CustomerProfile;