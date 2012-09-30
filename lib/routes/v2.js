exports.accounts = {
	list: ['/v2/accounts', 'GET'],
	get: ['/v2/accounts/:account_code', 'GET'],
	create: ['/v2/accounts', 'POST'],
	update: ['/v2/accounts/:account_code', 'POST'],
	close: ['/v2/accounts/:account_code', 'DELETE'],
	reopen: ['/v2/accounts/:account_code/reopen', 'PUT']
}

exports.adjustments = {
	get: ['/v2/accounts/:account_code/adjustments', 'GET'],
	create: ['/v2/accounts/:account_code/adjustments', 'POST'],
	remove: ['/v2/adjustments/:uuid', 'DELETE']
}

exports.billingInfo = {
	get: ['/v2/accounts/:account_code/billing_info', 'GET'],
	update: ['/v2/accounts/:account_code/billing_info', 'PUT'],
	remove: ['/v2/accounts/:account_code/billing_info', 'DELETE']
}

exports.coupons = {
	list: ['/v2/coupons', 'GET'],
	get: ['/v2/coupons/:coupon_code', 'GET'],
	create: ['/v2/coupons', 'POST'],
	deactivate: ['/v2/coupons/:coupon_code', 'DELETE']
}

exports.couponRedemption = {
	redeem: ['/v2/coupons/:coupon_code/redeem', 'POST'],
	get: ['/v2/accounts/:account_code/redemption', 'GET'],
	remove: ['/v2/accounts/:account_code/redemption', 'DELETE'],
	getByInvoice: ['/v2/invoices/:invoice_number/redemption', 'GET']
}

exports.invoices = {
	list: ['/v2/invoices', 'GET'],
	listByAccount: ['/v2/accounts/:account_code/invoices', 'GET'],
	get: ['/v2/invoices/:invoice_number', 'GET'],
	create: ['/v2/accounts/:account_code/invoices', 'POST'],
	markSuccessful: ['/v2/invoices/:invoice_number/mark_successful', 'PUT'],
	markFailed: ['/v2/invoices/:invoice_number/mark_failed', 'PUT']
}

exports.plans = {
	list: ['/v2/plans', 'GET'],
	get: ['/v2/plans/:plan_code', 'GET'],
	create: ['/v2/plans', 'POST'],
	update: ['/v2/plans/:plan_code', 'PUT'],
	remove: ['/v2/plans/:plan_code', 'DELETE']
}

exports.planAddons = {
	list: ['/v2/plans/:plan_code/add_ons', 'GET'],
	get: ['/v2/plans/:plan_code/add_ons/:addon_code', 'GET'],
	create: ['/v2/plans/:plan_code/add_ons', 'POST'],
	update: ['/v2/plans/:plan_code/add_ons/:add_on_code', 'PUT'],
	remove: ['/v2/plans/:plan_code/add_ons/:add_on_code', 'DELETE']
}

exports.subscriptions = {
	list: ['/v2/subscriptions', 'GET'],
	listByAccount: ['/v2/accounts/:account_code/subscriptions', 'GET'],
	get: ['/v2/subscriptions/:uuid', 'GET'],
	create: ['/v2/subscriptions', 'POST'],
	update: ['/v2/subscriptions/:uuid', 'PUT'],
	cancel: ['/v2/subscriptions/:uuid/cancel', 'PUT'],
	reactivate: ['/v2/subscriptions/:uuid/reactivate', 'PUT'],
	terminate: ['/v2/subscriptions/:uuid/terminate?refund=:refund_type', 'PUT'],
	postpone: ['/v2/subscriptions/:uuid/postpone?next_renewal_date=:next_renewal_date', 'PUT']
}

exports.transactions = {
	list: ['/v2/transactions', 'GET'],
	listByAccount: ['/v2/accounts/:account_code/transactions', 'GET'],
	get: ['/v2/transactions/:id', 'GET'],
	create: ['/v2/transactions', 'POST'],
	refund: ['/v2/transactions/:id', 'DELETE']
}
