/// <reference path="../../types/client.d.ts" />
class SignupFormViewModel implements IPageViewModel {
    template = 'SignupFormView';
    title = 'Signup an OpenQ account';
    username = ko.observable('');
    password = ko.observable('');
    isUsernameAvailable = ko.observable(false);
    showPasswordIndicator: KnockoutComputed<boolean>;
    showAvailableIndicator: KnockoutComputed<boolean>;
    passwordStrength: KnockoutComputed<number>;
    passwordStrengthLabel: KnockoutComputed<string>;
    passwordStrengthClass: KnockoutComputed<string>;

    constructor() {
        this.showAvailableIndicator = ko.computed(() => {
            return this.username() != '';
        });

        this.showPasswordIndicator = ko.computed(() => {
            return this.password() != '';
        });

        this.passwordStrength = ko.computed(() => {
            if (this.password().length <= 6) {
                return 0;
            }

            if (this.password().length <= 12) {
                return 1;
            }

            return 2;
        });

        this.passwordStrengthLabel = ko.computed(() => {
            if (this.passwordStrength() === 2) {
                return "Yeah! Alright now we're talking secure!";
            }

            if (this.passwordStrength() === 1) {
                return "Come on! You can do better than that!";
            }

            return "Dude, that password is weak!";
        });

        this.passwordStrengthClass = ko.computed(() => {
            if (this.passwordStrength() === 2) {
                return "label success";
            }

            if (this.passwordStrength() === 1) {
                return "label warning";
            }

            return "label important";
        });
    }

    create() {
        console.log('creating account...');
    }
}