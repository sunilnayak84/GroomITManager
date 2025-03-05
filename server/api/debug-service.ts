import express from 'express';
import { logger } from '../utils/logger';
import admin from 'firebase-admin';

class DebugService {
  async getFirestoreDocument(collection: string, id: string) {
    try {
      logger.info(`[DEBUG] Getting document: ${collection}/${id}`);
      const doc = await admin.firestore().collection(collection).doc(id).get();

      if (!doc.exists) {
        return { exists: false, id };
      }

      return { exists: true, id, data: doc.data() };
    } catch (error) {
      logger.error(`[DEBUG] Error getting document: ${collection}/${id}`, error);
      throw error;
    }
  }

  async debugAppointment(appointmentId: string) {
    try {
      logger.info(`[DEBUG] Debugging appointment: ${appointmentId}`);
      const appointmentDoc = await admin.firestore().collection('appointments').doc(appointmentId).get();

      if (!appointmentDoc.exists) {
        logger.error(`[DEBUG] Appointment not found: ${appointmentId}`);
        return { exists: false, id: appointmentId };
      }

      const appointment = appointmentDoc.data();

      const debug = {
        exists: true,
        id: appointmentId,
        data: appointment,
        customerRefs: {
          customerId: appointment?.customerId,
          customerObj: appointment?.customer,
          customerDetails: appointment?.customerDetails,
          customerRef: appointment?.customerRef,
          petOwner: appointment?.pet?.owner,
          petRefOwner: appointment?.petRef?.owner
        }
      };

      logger.info(`[DEBUG] Appointment debug info: ${JSON.stringify(debug, null, 2)}`);
      return debug;
    } catch (error) {
      logger.error(`[DEBUG] Error debugging appointment: ${appointmentId}`, error);
      throw error;
    }
  }

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