import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionService } from '../services/permission.service';

/**
 * Structural directive that conditionally renders elements based on user roles.
 * 
 * Usage:
 * - Single role: *appHasRole="2"
 * - Multiple roles: *appHasRole="[2, 3]"
 * - Using enum: *appHasRole="[Roles.SystemAdministrator, Roles.EntityAdministrator]"
 * 
 * The directive checks the current user's System_Role_ID from LocalStorageService
 * and only renders the element if the user has one of the specified roles.
 */
@Directive({
    selector: '[appHasRole]',
    standalone: true,
})
export class HasRoleDirective implements OnInit {
    /**
     * Input property that accepts a single role ID or an array of role IDs.
     * The element will be shown if the current user's role matches any of these IDs.
     */
    @Input() appHasRole!: number | number[];

    /**
     * Flag to track if the view has been created.
     * This helps us avoid creating multiple views unnecessarily.
     */
    private hasView: boolean = false;

    constructor(
        /**
         * TemplateRef gives us access to the template that this directive is applied to.
         * We use it to create the view when the user has the required role.
         */
        private templateRef: TemplateRef<any>,
        /**
         * ViewContainerRef gives us access to the container where we can add/remove views.
         * We use it to conditionally render or hide the element.
         */
        private viewContainer: ViewContainerRef,
        /**
         * PermissionService centralizes role-based decisions.
         */
        private permissionService: PermissionService
    ) { }

    ngOnInit(): void {
        // Check the user's role and update the view accordingly
        this.updateView();
    }

    /**
     * Updates the view based on whether the current user has the required role.
     * If the user has the role, the element is shown. Otherwise, it's hidden.
     */
    private updateView(): void {
        // Normalize the input: convert single number to array for easier checking
        const allowedRoles = Array.isArray(this.appHasRole)
            ? this.appHasRole
            : [this.appHasRole];

        // Check if the user's role is in the list of allowed roles
        const hasRequiredRole = this.permissionService.hasAnyRole(allowedRoles);

        // If user has the required role and view hasn't been created, create it
        if (hasRequiredRole && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        }
        // If user doesn't have the required role and view exists, clear it
        else if (!hasRequiredRole && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
        }
    }
}

