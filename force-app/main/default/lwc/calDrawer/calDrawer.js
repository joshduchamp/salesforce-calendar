import { LightningElement, api } from 'lwc';

const SIZE_CLASS = {
    small: 'drawer_small',
    medium: 'drawer_medium',
    large: 'drawer_large'
};

/**
 * Reusable slide-out panel over a dimmed backdrop, docked to the left or right
 * edge. Presentational: the host owns `open` and reacts to `close`, which fires
 * on a backdrop click, the close button, or Escape. Panel content is projected
 * through the default slot.
 */
export default class CalDrawer extends LightningElement {
    @api label = '';
    /** `left` (default) or `right`. */
    @api side = 'left';
    /** `small` | `medium` (default) | `large`. */
    @api size = 'medium';

    _open = false;

    @api
    get open() {
        return this._open;
    }
    set open(value) {
        this._open = Boolean(value);
        if (this._open) {
            this.bindKeydown();
        } else {
            this.unbindKeydown();
        }
    }

    get panelClass() {
        const side = this.side === 'right' ? 'drawer_right' : 'drawer_left';
        return `drawer__panel ${side} ${SIZE_CLASS[this.size] || SIZE_CLASS.medium}`;
    }

    disconnectedCallback() {
        this.unbindKeydown();
    }

    bindKeydown() {
        if (this._onKeydown) {
            return;
        }
        this._onKeydown = (event) => {
            if (event.key === 'Escape') {
                this.emitClose();
            }
        };
        document.addEventListener('keydown', this._onKeydown, true);
    }

    unbindKeydown() {
        if (this._onKeydown) {
            document.removeEventListener('keydown', this._onKeydown, true);
            this._onKeydown = undefined;
        }
    }

    emitClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }
}