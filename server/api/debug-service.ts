
import express from 'express';
import { logger } from '../utils/logger';
import admin from 'firebase-admin';

class DebugService {
  async getAppointmentStructure(appointmentId: string) {
    try {
      logger.info('[DEBUG] Fetching appointment structure:', appointmentId);
      
      // Get the appointment document
      const appointmentDoc = await admin.firestore()
        .collection('appointments')
        .doc(appointmentId)
        .get();
      
      if (!appointmentDoc.exists) {
        return { error: 'Appointment not found' };
      }
      
      const appointment = appointmentDoc.data() || {};
      
      // Look for related customer records
      let customerData = null;
      if (appointment.customerId) {
        const customerDoc = await admin.firestore()
          .collection('customers')
          .doc(appointment.customerId)
          .get();
        
        if (customerDoc.exists) {
          customerData = customerDoc.data();
        }
      }
      
      // Look for appointment-customer relationships
      const appointmentCustomerQuery = await admin.firestore()
        .collection('appointments-customers')
        .where('appointmentId', '==', appointmentId)
        .limit(1)
        .get();
      
      let appointmentCustomerRelation = null;
      if (!appointmentCustomerQuery.empty) {
        appointmentCustomerRelation = appointmentCustomerQuery.docs[0].data();
      }
      
      return {
        appointmentId,
        appointmentFields: Object.keys(appointment),
        appointmentData: appointment,
        customerReference: appointment.customerId,
        customerData: customerData,
        appointmentCustomerRelation
      };
    } catch (error) {
      logger.error('[DEBUG] Error fetching appointment structure:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  setupRoutes(router: express.Router) {
    router.get('/debug/appointment/:id', async (req, res) => {
      try {
        const appointmentId = req.params.id;
        const data = await this.getAppointmentStructure(appointmentId);
        res.json(data);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    return router;
  }
}

export default new DebugService();
