
import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";

export default function CustomerProfilePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [customerData, setCustomerData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    gender: ""
  });

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!user?.email) return;
      
      try {
        // Query customer by email
        const customerRef = doc(db, "customers", user.id);
        const customerDoc = await getDoc(customerRef);
        
        if (customerDoc.exists()) {
          const data = customerDoc.data();
          setCustomerData({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            gender: data.gender || ""
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch profile data",
          variant: "destructive",
        });
      }
    };

    fetchCustomerData();
  }, [user?.email]);

  const handleSave = async () => {
    try {
      if (!user?.id) return;
      
      const customerRef = doc(db, "customers", user.id);
      await updateDoc(customerRef, {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        phone: customerData.phone,
        address: customerData.address,
        gender: customerData.gender,
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name</label>
            {isEditing ? (
              <Input 
                value={customerData.firstName} 
                onChange={(e) => setCustomerData(prev => ({...prev, firstName: e.target.value}))} 
              />
            ) : (
              <p className="text-lg">{customerData.firstName}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name</label>
            {isEditing ? (
              <Input 
                value={customerData.lastName} 
                onChange={(e) => setCustomerData(prev => ({...prev, lastName: e.target.value}))} 
              />
            ) : (
              <p className="text-lg">{customerData.lastName}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <p className="text-lg">{customerData.email}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            {isEditing ? (
              <Input 
                value={customerData.phone} 
                onChange={(e) => setCustomerData(prev => ({...prev, phone: e.target.value}))} 
              />
            ) : (
              <p className="text-lg">{customerData.phone}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            {isEditing ? (
              <Input 
                value={customerData.address} 
                onChange={(e) => setCustomerData(prev => ({...prev, address: e.target.value}))} 
              />
            ) : (
              <p className="text-lg">{customerData.address || "Not set"}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Gender</label>
            {isEditing ? (
              <Select 
                value={customerData.gender} 
                onValueChange={(value) => setCustomerData(prev => ({...prev, gender: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-lg">{customerData.gender || "Not set"}</p>
            )}
          </div>
          <div className="pt-4">
            {isEditing ? (
              <div className="space-x-2">
                <Button onClick={handleSave}>Save Changes</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
