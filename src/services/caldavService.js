/**
 * @copyright Copyright (c) 2020 Georg Ehrke
 *
 * @author Georg Ehrke <oc.list@georgehrke.com>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */
import DavClient from 'cdav-library'
import { generateRemoteUrl } from '@nextcloud/router'
import { getRequestToken } from '@nextcloud/auth'
import { CALDAV_BIRTHDAY_CALENDAR } from '../models/consts.js'

let client = null
const getClient = () => {
	if (client) {
		return client
	}

	client = new DavClient({
		rootUrl: generateRemoteUrl('dav'),
	}, () => {
		const headers = {
			'X-Requested-With': 'XMLHttpRequest',
			'requesttoken': getRequestToken(),
			'X-NC-CalDAV-Webcal-Caching': 'On',
		}
		const xhr = new XMLHttpRequest()
		const oldOpen = xhr.open

		// override open() method to add headers
		xhr.open = function() {
			const result = oldOpen.apply(this, arguments)
			for (const name in headers) {
				xhr.setRequestHeader(name, headers[name])
			}

			return result
		}

		OC.registerXHRForErrorProcessing(xhr) // eslint-disable-line no-undef
		return xhr
	})

	return getClient()
}

/**
 * Initializes the client for use in the user-view
 */
const initializeClientForUserView = async() => {
	await getClient().connect({ enableCalDAV: true })
}

/**
 * Initializes the client for use in the public/embed-view
 */
const initializeClientForPublicView = async() => {
	await getClient()._createPublicCalendarHome()
}

/**
 * Fetch all calendars from the server
 *
 * @returns {Promise<Calendar[]>}
 */
const findAllCalendars = () => {
	return getClient().calendarHomes[0].findAllCalendars()
}

/**
 * Fetch public calendars by their token
 *
 * @param {String[]} tokens List of tokens
 * @returns {Promise<Calendar[]>}
 */
const findPublicCalendarsByTokens = async(tokens) => {
	const findPromises = []

	for (const token of tokens) {
		const promise = getClient().publicCalendarHome
			.find(token)
			.catch(() => null) // Catch outdated tokens

		findPromises.push(promise)
	}

	const calendars = await Promise.all(findPromises)
	return calendars.filter((calendar) => calendar !== null)
}

/**
 * Fetches all scheduling inboxes
 *
 * Nitpick detail: Technically, we shouldn't be querying all scheduling inboxes
 * in the calendar-home and just take the first one, but rather query the
 * "CALDAV:schedule-inbox-URL" property on the principal URL and take that one.
 * However, it doesn't make any difference for the Nextcloud CalDAV server
 * and saves us extraneous requests here.
 *
 * https://tools.ietf.org/html/rfc6638#section-2.2.1
 *
 * @returns {Promise<ScheduleInbox[]>}
 */
const findSchedulingInbox = async() => {
	const inboxes = await getClient().calendarHomes[0].findAllScheduleInboxes()
	return inboxes[0]
}

/**
 * Fetches all scheduling outboxes
 *
 * Nitpick detail: Technically, we shouldn't be querying all scheduling outboxes
 * in the calendar-home and just take the first one, but rather query the
 * "CALDAV:schedule-outbox-URL" property on the principal URL and take that one.
 * However, it doesn't make any difference for the Nextcloud CalDAV server
 * and saves us extraneous requests here.
 *
 * https://tools.ietf.org/html/rfc6638#section-2.1.1
 *
 * @returns {Promise<ScheduleOutbox>}
 */
const findSchedulingOutbox = async() => {
	const outboxes = await getClient().calendarHomes[0].findAllScheduleOutboxes()
	return outboxes[0]
}

/**
 * Creates a calendar
 *
 * @param {String} displayName Visible name
 * @param {String} color Color
 * @param {String[]} components Supported component set
 * @param {Number} order Order of calendar in list
 * @param {String} timezoneIcs ICS representation of timezone
 * @returns {Promise<Calendar>}
 */
const createCalendar = async(displayName, color, components, order, timezoneIcs) => {
	return getClient().calendarHomes[0].createCalendarCollection(displayName, color, components, order, timezoneIcs)
}

/**
 * Creates a subscription
 *
 * This function does not return a subscription, but a cached calendar
 *
 * @param {String} displayName Visible name
 * @param {String} color Color
 * @param {String} source Link to WebCAL Source
 * @param {Number} order Order of calendar in list
 * @returns {Promise<Calendar>}
 */
const createSubscription = async(displayName, color, source, order) => {
	return getClient().calendarHomes[0].createSubscribedCollection(displayName, color, source, order)
}

/**
 * Enables the birthday calendar
 *
 * @returns {Promise<Calendar>}
 */
const enableBirthdayCalendar = async() => {
	await getClient().calendarHomes[0].enableBirthdayCalendar()
	return getBirthdayCalendar()
}

/**
 * Gets the birthday calendar
 *
 * @returns {Promise<Calendar>}
 */
const getBirthdayCalendar = async() => {
	return getClient().calendarHomes[0].find(CALDAV_BIRTHDAY_CALENDAR)
}

/**
 * Returns the Current User Principal
 *
 * @returns {Principal}
 */
const getCurrentUserPrincipal = () => {
	return getClient().currentUserPrincipal
}

/**
 * Finds calendar principals by displayname
 *
 * @param {String} query The search-term
 * @returns {Promise<void>}
 */
const findPrincipalsByDisplayName = async(query) => {
	return getClient().principalPropertySearchByDisplayname(query)
}

/**
 * Finds one principal by it's URL
 *
 * @param {String} url The principal-url
 * @returns {Promise<Principal>}
 */
const findPrincipalByUrl = async(url) => {
	return getClient().findPrincipal(url)
}

export {
	initializeClientForUserView,
	initializeClientForPublicView,
	findAllCalendars,
	findPublicCalendarsByTokens,
	findSchedulingInbox,
	findSchedulingOutbox,
	createCalendar,
	createSubscription,
	enableBirthdayCalendar,
	getBirthdayCalendar,
	getCurrentUserPrincipal,
	findPrincipalsByDisplayName,
	findPrincipalByUrl,
}
