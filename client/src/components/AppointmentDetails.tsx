
<old_str>
const AppointmentCompletionForm = ({ isOpen, onClose, appointmentId, serviceId, onComplete }: { isOpen: boolean; onClose: () => void; appointmentId: number; serviceId: number; onComplete: () => void; }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                {/* Add your inventory usage form here */}
                <p>Inventory Usage Form (Placeholder)</p>
                <Button onClick={onComplete}>Submit</Button>
            </DialogContent>
        </Dialog>
    );
}
</old_str>
<new_str>
import { AppointmentCompletionForm } from "./AppointmentCompletionForm";
</new_str>
