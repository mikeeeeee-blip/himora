# Production Branch Status

## Current Production Branch

**Branch Name:** `ptmversion(1.0.0)`  
**Status:** ✅ **LIVE IN PRODUCTION**  
**Domain:** Production domain is using this branch  
**Last Updated:** $(date)

## Rollback Information

### Temporary Rollback

We have temporarily rolled back from commit `6649229` (Paytm UPI deep link implementation) to commit `9a85d4f` (Round-robin rotation implementation).

**Reason for Rollback:**
- The Paytm UPI deep link feature (`6649229`) has been temporarily rolled back
- Current production is running on the stable round-robin rotation implementation

**Rolled Back Commit:**
- **Commit Hash:** `6649229`
- **Commit Message:** `feat: add UPI deep link generation and custom checkout page for Paytm payments; enhance transaction model to store Paytm payment URL; implement smart UPI app detection for improved user experience`

**Current Production Commit:**
- **Commit Hash:** `9a85d4f`
- **Commit Message:** `refactor: implement round-robin rotation for payment gateways, replacing transaction-count-based logic; update related components and UI for improved user experience and clarity`

## Branch Structure

```
ptmversion(1.0.0) (PRODUCTION) ← Current live branch
├── 9a85d4f - Round-robin rotation implementation (CURRENT)
└── [Previous commits...]

fix#15 (DEVELOPMENT)
└── 6649229 - Paytm UPI deep link implementation (ROLLED BACK)
```

## Important Notes

1. **DO NOT** merge `fix#15` into `ptmversion(1.0.0)` without proper testing
2. All production deployments should be made from `ptmversion(1.0.0)` branch
3. The Paytm UPI deep link feature will be re-implemented in a new feature branch
4. Always verify the branch before deploying to production

## Next Steps

1. Create a new feature branch from `ptmversion(1.0.0)` for implementing new features
2. Test all new features thoroughly before merging to production branch
3. Maintain this document with any branch status changes

---

**Last Updated:** $(date)  
**Maintained By:** Development Team

