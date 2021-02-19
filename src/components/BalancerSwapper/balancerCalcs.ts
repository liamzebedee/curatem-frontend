import { BigNumber } from 'ethers';

export const BONE = BigNumber.from(10).pow(18);
const BPOW_PRECISION = BONE.div(BigNumber.from(10).pow(10));

export function calcOutGivenIn(
    tokenBalanceIn: BigNumber,
    tokenWeightIn: BigNumber,
    tokenBalanceOut: BigNumber,
    tokenWeightOut: BigNumber,
    tokenAmountIn: BigNumber,
    swapFee: BigNumber
): BigNumber {
    let weightRatio = bdiv(tokenWeightIn, tokenWeightOut);
    let adjustedIn = BONE.sub(swapFee);
    adjustedIn = bmul(tokenAmountIn, adjustedIn);
    let y = bdiv(tokenBalanceIn, tokenBalanceIn.add(adjustedIn));
    let foo = bpow(y, weightRatio);
    let bar = BONE.sub(foo);
    let tokenAmountOut = bmul(tokenBalanceOut, bar);
    return tokenAmountOut;
}

export function calcInGivenOut(
    tokenBalanceIn: BigNumber,
    tokenWeightIn: BigNumber,
    tokenBalanceOut: BigNumber,
    tokenWeightOut: BigNumber,
    tokenAmountOut: BigNumber,
    swapFee: BigNumber
) {
    let weightRatio = bdiv(tokenWeightOut, tokenWeightIn);
    let diff = tokenBalanceOut.sub(tokenAmountOut);
    let y = bdiv(tokenBalanceOut, diff);
    let foo = bpow(y, weightRatio);
    foo = foo.sub(BONE);
    let tokenAmountIn = BONE.sub(swapFee);
    tokenAmountIn = bdiv(bmul(tokenBalanceIn, foo), tokenAmountIn);
    return tokenAmountIn;
}

export function calcSpotPrice(
    tokenBalanceIn: BigNumber,
    tokenWeightIn: BigNumber,
    tokenBalanceOut: BigNumber,
    tokenWeightOut: BigNumber,
    swapFee: BigNumber
) {
    const numer = bdiv(tokenBalanceIn, tokenWeightIn);
    const denom = bdiv(tokenBalanceOut, tokenWeightOut);
    const ratio = bdiv(numer, denom);
    const scale = bdiv(BONE, bsubSign(BONE, swapFee).res);
    return bmul(ratio, scale);
}

export function bmul(a: BigNumber, b: BigNumber): BigNumber {
    let c0 = a.mul(b);
    let c1 = c0.add(BONE.div(BigNumber.from(2)));
    let c2 = c1.div(BONE);
    return c2;
}

export function bdiv(a: BigNumber, b: BigNumber): BigNumber {
    let c0 = a.mul(BONE);
    let c1 = c0.add(b.div(BigNumber.from(2)));
    let c2 = c1.div(b);
    return c2;
}

function btoi(a: BigNumber): BigNumber {
    return a.div(BONE);
}

function bfloor(a: BigNumber): BigNumber {
    return btoi(a).mul(BONE);
}

function bsubSign(
    a: BigNumber,
    b: BigNumber
): { res: BigNumber; bool: boolean } {
    if (a.gte(b)) {
        let res = a.sub(b);
        let bool = false;
        return { res, bool };
    } else {
        let res = b.sub(a);
        let bool = true;
        return { res, bool };
    }
}

function bpowi(a: BigNumber, n: BigNumber): BigNumber {
    let z = !n.mod(BigNumber.from(2)).eq(BigNumber.from(0)) ? a : BONE;

    for (
        // TODO idiv
        n = n.div(BigNumber.from(2));
        !n.eq(BigNumber.from(0));
        n = n.div(BigNumber.from(2))
    ) {
        a = bmul(a, a);
        if (!n.mod(BigNumber.from(2)).eq(BigNumber.from(0))) {
            z = bmul(z, a);
        }
    }
    return z;
}

function bpow(base: BigNumber, exp: BigNumber): BigNumber {
    let whole = bfloor(exp);
    let remain = exp.sub(whole);
    let wholePow = bpowi(base, btoi(whole));
    if (remain.eq(BigNumber.from(0))) {
        return wholePow;
    }

    let partialResult = bpowApprox(base, remain, BPOW_PRECISION);
    return bmul(wholePow, partialResult);
}

function bpowApprox(
    base: BigNumber,
    exp: BigNumber,
    precision: BigNumber
): BigNumber {
    let a = exp;
    let { res: x, bool: xneg } = bsubSign(base, BONE);
    let term = BONE;
    let sum = term;
    let negative = false;

    for (let i = 1; term.gte(precision); i++) {
        let bigK = BigNumber.from(i).mul(BONE);
        let { res: c, bool: cneg } = bsubSign(a, bigK.sub(BONE));
        term = bmul(term, bmul(c, x));
        term = bdiv(term, bigK);
        if (term.eq(BigNumber.from(0))) break;

        if (xneg) negative = !negative;
        if (cneg) negative = !negative;
        if (negative) {
            sum = sum.sub(term);
        } else {
            sum = sum.add(term);
        }
    }

    return sum;
}
