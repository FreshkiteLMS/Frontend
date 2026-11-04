import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfirmDialog } from '../settings-ui';

afterEach(cleanup);

const open = (props: Partial<React.ComponentProps<typeof ConfirmDialog>>) => {
    const onConfirm = props.onConfirm ?? vi.fn().mockResolvedValue(undefined);
    render(<ConfirmDialog title="Delete?" body="Sure?" confirmLabel="Delete my account" danger onClose={vi.fn()} {...props} onConfirm={onConfirm} />);
    return { onConfirm: onConfirm as ReturnType<typeof vi.fn>, confirm: screen.getByRole('button', { name: 'Delete my account' }) as HTMLButtonElement };
};

describe('ConfirmDialog for account deletion', () => {
    test('password: stays disabled until a password is typed, then sends it', async () => {
        const { onConfirm, confirm } = open({ requirePassword: true });
        expect(confirm.disabled).toBe(true);
        fireEvent.change(screen.getByLabelText(/Confirm with your password/), { target: { value: 'Learn1234' } });
        expect(confirm.disabled).toBe(false);
        fireEvent.click(confirm);
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Learn1234'));
    });

    test('retyped email: stays disabled until it matches, ignoring case', async () => {
        const { onConfirm, confirm } = open({ requireText: { label: 'Type your email', value: 'ana@x.dev' } });
        const input = screen.getByLabelText(/Type your email/);
        fireEvent.change(input, { target: { value: 'ana@x' } });
        expect(confirm.disabled).toBe(true);
        fireEvent.change(input, { target: { value: 'ANA@x.dev' } });
        expect(confirm.disabled).toBe(false);
        fireEvent.click(confirm);
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('ANA@x.dev'));
    });

    test('a failure is shown and the dialog stays usable', async () => {
        const onConfirm = vi.fn().mockRejectedValue(new Error('Password is incorrect'));
        const { confirm } = open({ requirePassword: true, onConfirm });
        fireEvent.change(screen.getByLabelText(/Confirm with your password/), { target: { value: 'nope' } });
        fireEvent.click(confirm);
        expect(await screen.findByText('Password is incorrect')).toBeTruthy();
        await waitFor(() => expect(confirm.disabled).toBe(false));
    });
});
