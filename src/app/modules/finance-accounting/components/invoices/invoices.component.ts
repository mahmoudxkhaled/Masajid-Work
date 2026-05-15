import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MessageService, MenuItem } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';

export interface IInvoiceModel {
    id: string;
    invoiceNumber: string;
    clientName: string;
    description: string;
    amount: number;
    status: string;
    dueDate?: string;
    createdDate?: string;
    paidDate?: string;
}

@Component({
    selector: 'app-invoices',
    templateUrl: './invoices.component.html',
    styleUrls: ['./invoices.component.scss'],
    providers: [MessageService]
})
export class InvoicesComponent implements OnInit, OnDestroy {

    invoices: IInvoiceModel[] = [];
    invoiceMenuItems: MenuItem[] = [];

    currentSelectedInvoice: IInvoiceModel = {
        id: '',
        invoiceNumber: '',
        clientName: '',
        description: '',
        amount: 0,
        status: ''
    };

    invoiceForm!: FormGroup;

    invoiceDialog: boolean = false;
    deleteInvoiceDialog: boolean = false;

    tableLoadingSpinner: boolean = false;

    statusOptions = [
        { label: 'Paid', value: 'Paid' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Overdue', value: 'Overdue' },
        { label: 'Draft', value: 'Draft' },
        { label: 'Cancelled', value: 'Cancelled' }
    ];

    constructor(
        public translate: TranslationService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.buildInvoiceMenuItems();
        this.initiateInvoiceForm();
        this.loadInvoices();
    }

    buildInvoiceMenuItems() {
        this.invoiceMenuItems = [
            {
                label: this.translate.getInstant('shared.actions.edit'),
                icon: 'pi pi-fw pi-pencil',
                command: () => this.openInvoiceEditDialog(this.currentSelectedInvoice),
            },
            {
                label: this.translate.getInstant('shared.actions.delete'),
                icon: 'pi pi-fw pi-trash',
                command: () => this.openInvoiceDeleteDialog(this.currentSelectedInvoice),
            }
        ];
    }

    assignCurrentInvoice(invoice: IInvoiceModel) {
        this.currentSelectedInvoice = invoice;
    }

    loadInvoices() {
        this.tableLoadingSpinner = true;

        // Static mock data for invoices
        this.invoices = [
            {
                id: '1',
                invoiceNumber: '#INV-2024-001',
                clientName: 'Acme Corporation',
                description: 'Software Development Services',
                amount: 5250.00,
                status: 'Paid',
                dueDate: '2024-02-15',
                createdDate: '2024-01-15',
                paidDate: '2024-01-20'
            },
            {
                id: '2',
                invoiceNumber: '#INV-2024-002',
                clientName: 'Tech Solutions Ltd',
                description: 'Consulting Services',
                amount: 3800.00,
                status: 'Pending',
                dueDate: '2024-02-18',
                createdDate: '2024-01-18'
            },
            {
                id: '3',
                invoiceNumber: '#INV-2024-003',
                clientName: 'Global Enterprises',
                description: 'Project Management',
                amount: 7200.00,
                status: 'Overdue',
                dueDate: '2024-01-20',
                createdDate: '2024-01-20'
            },
            {
                id: '4',
                invoiceNumber: '#INV-2024-004',
                clientName: 'Startup Inc',
                description: 'Web Development',
                amount: 4500.00,
                status: 'Paid',
                dueDate: '2024-02-10',
                createdDate: '2024-01-10',
                paidDate: '2024-01-12'
            },
            {
                id: '5',
                invoiceNumber: '#INV-2024-005',
                clientName: 'Manufacturing Co',
                description: 'System Integration',
                amount: 8900.00,
                status: 'Draft',
                dueDate: '2024-03-01',
                createdDate: '2024-01-25'
            }
        ];

        this.tableLoadingSpinner = false;
    }

    onGlobalFilter(table: any, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    navigateToCreateInvoice() {
        this.invoiceDialog = true;
        this.invoiceForm.reset();
    }

    openInvoiceEditDialog(invoice: IInvoiceModel) {
        this.invoiceDialog = true;
        this.currentSelectedInvoice = invoice;
        this.invoiceForm.patchValue({
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.clientName,
            description: invoice.description,
            amount: invoice.amount,
            status: invoice.status,
            dueDate: invoice.dueDate,
            createdDate: invoice.createdDate,
            paidDate: invoice.paidDate
        });
    }

    openInvoiceDeleteDialog(invoice: IInvoiceModel) {
        this.deleteInvoiceDialog = true;
        this.currentSelectedInvoice = invoice;
    }

    hideInvoiceDialog() {
        this.invoiceDialog = false;
    }

    saveInvoice() {
        if (this.invoiceForm.valid) {
            if (this.currentSelectedInvoice.id) {
                // Edit existing invoice
                const index = this.invoices.findIndex(i => i.id === this.currentSelectedInvoice.id);
                if (index !== -1) {
                    this.invoices[index] = {
                        ...this.invoices[index],
                        invoiceNumber: this.invoiceForm.value.invoiceNumber,
                        clientName: this.invoiceForm.value.clientName,
                        description: this.invoiceForm.value.description,
                        amount: this.invoiceForm.value.amount,
                        status: this.invoiceForm.value.status,
                        dueDate: this.invoiceForm.value.dueDate,
                        createdDate: this.invoiceForm.value.createdDate,
                        paidDate: this.invoiceForm.value.paidDate
                    };
                }
            } else {
                // Add new invoice
                const newInvoice: IInvoiceModel = {
                    id: (this.invoices.length + 1).toString(),
                    invoiceNumber: this.invoiceForm.value.invoiceNumber,
                    clientName: this.invoiceForm.value.clientName,
                    description: this.invoiceForm.value.description,
                    amount: this.invoiceForm.value.amount,
                    status: this.invoiceForm.value.status,
                    dueDate: this.invoiceForm.value.dueDate,
                    createdDate: this.invoiceForm.value.createdDate,
                    paidDate: this.invoiceForm.value.paidDate
                };
                this.invoices.push(newInvoice);
            }

            this.hideInvoiceDialog();
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Invoice saved successfully',
                life: 3000
            });
        }
    }

    deleteInvoice() {
        const index = this.invoices.findIndex(i => i.id === this.currentSelectedInvoice.id);
        if (index !== -1) {
            this.invoices.splice(index, 1);
        }

        this.deleteInvoiceDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Invoice deleted successfully',
            life: 3000
        });
    }

    initiateInvoiceForm() {
        this.invoiceForm = new FormGroup({
            invoiceNumber: new FormControl<string>('', [Validators.required]),
            clientName: new FormControl<string>('', [Validators.required]),
            description: new FormControl<string>('', [Validators.required]),
            amount: new FormControl<number>(0, [Validators.required, Validators.min(0.01)]),
            status: new FormControl<string>('Draft', [Validators.required]),
            dueDate: new FormControl<string>(''),
            createdDate: new FormControl<string>(''),
            paidDate: new FormControl<string>('')
        });
    }

    getStatusSeverity(status: string): string {
        switch (status) {
            case 'Paid': return 'success';
            case 'Pending': return 'warning';
            case 'Overdue': return 'danger';
            case 'Draft': return 'info';
            case 'Cancelled': return 'secondary';
            default: return 'secondary';
        }
    }

    ngOnDestroy(): void {
        // Cleanup if needed
    }
}
