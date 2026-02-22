import { NextResponse } from 'next/server';

/**
 * Standard error response for API routes.
 */
export function apiError(
    message: string,
    status: number,
    error?: unknown
): NextResponse {
    return NextResponse.json(
        {
            message,
            ...(error !== undefined && {
                error: error instanceof Error ? error.message : String(error),
            }),
        },
        { status }
    );
}
