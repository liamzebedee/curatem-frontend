import { getAddress } from '@ethersproject/address';
import { BigNumber, ethers } from 'ethers';
import { DateTime } from 'luxon';
import moment from 'moment'

// returns the checksummed address if the address is valid, otherwise returns false
export function isAddress(value: any): string | false {
    try {
        return getAddress(value);
    } catch {
        return false;
    }
}

// shorten the checksummed version of the input address to have 0x + 4 characters at start and end
export function shortenAddress(address: string, chars = 4): string {
    const parsed = isAddress(address);
    if (!parsed) {
        throw Error(`Invalid 'address' parameter '${address}'.`);
    }
    return `${parsed.substring(0, chars + 2)}...${parsed.substring(42 - chars)}`;
}

export function toWei(amount: string) {
    return ethers.utils.parseUnits(amount, 'ether');
}

export function fromWei(amount: string) {
    return ethers.utils.formatEther(BigNumber.from(amount));
}

export function toPercent(number: string): string {
    return (parseFloat(number) * 100).toFixed(1)
}

export function toRelativeTs(unixTs: number) {
    return DateTime.fromMillis(unixTs * 1000).toRelative();
}

export function timeAgo(date: DateTime) {
    return moment(date.toMillis()).fromNow();
}