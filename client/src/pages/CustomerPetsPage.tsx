const handleAddPet = async (formData: any) => {
    try {
      console.log('Starting pet submission...', {
        userRole: user?.role,
        userPermissions: user?.permissions,
        hasManagePetsPermission: hasPermission('manage_own_pets')
      });
      
      if (!user?.uid || !user?.email) {
        throw new Error('User not authenticated');
      }

      if (!hasPermission('create_pets')) {
        throw new Error('You do not have permission to create pets');
      }

      const result = await addPet(formData);
      toast({
        title: "Success",
        description: "Pet added successfully"
      });
      return true;
    } catch (error: any) {
      console.error('Error adding pet:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred."
      });
      return false;
    }
  };