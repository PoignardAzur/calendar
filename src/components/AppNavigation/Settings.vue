<!--
  - @copyright Copyright (c) 2019 Georg Ehrke <oc.list@georgehrke.com>
  - @author Georg Ehrke <oc.list@georgehrke.com>
  -
  - @license GNU AGPL version 3 or any later version
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of the
  - License, or (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program. If not, see <http://www.gnu.org/licenses/>.
  -
  -->

<template>
	<AppNavigationSettings :title="settingsTitle">
		<ul class="settings-fieldset-interior">
			<SettingsImportSection :is-disabled="loadingCalendars" />
			<ActionCheckbox
				class="settings-fieldset-interior-item"
				:checked="birthdayCalendar"
				:disabled="isBirthdayCalendarDisabled"
				@update:checked="toggleBirthdayEnabled">
				{{ $t('calendar', 'Enable birthday calendar') }}
			</ActionCheckbox>
			<ActionCheckbox
				class="settings-fieldset-interior-item"
				:checked="showTasks"
				:disabled="savingTasks"
				@update:checked="toggleTasksEnabled">
				{{ $t('calendar', 'Show tasks in calendar') }}
			</ActionCheckbox>
			<ActionCheckbox
				class="settings-fieldset-interior-item"
				:checked="showPopover"
				:disabled="savingPopover"
				@update:checked="togglePopoverEnabled">
				{{ $t('calendar', 'Enable simplified editor') }}
			</ActionCheckbox>
			<ActionCheckbox
				class="settings-fieldset-interior-item"
				:checked="eventLimit"
				:disabled="savingEventLimit"
				@update:checked="toggleEventLimitEnabled">
				{{ $t('calendar', 'Limit visible events per view') }}
			</ActionCheckbox>
			<ActionCheckbox
				class="settings-fieldset-interior-item"
				:checked="showWeekends"
				:disabled="savingWeekend"
				@update:checked="toggleWeekendsEnabled">
				{{ $t('calendar', 'Show weekends') }}
			</ActionCheckbox>
			<ActionCheckbox
				class="settings-fieldset-interior-item"
				:checked="showWeekNumbers"
				:disabled="savingWeekNumber"
				@update:checked="toggleWeekNumberEnabled">
				{{ $t('calendar', 'Show week numbers') }}
			</ActionCheckbox>
			<li class="settings-fieldset-interior-item settings-fieldset-interior-item--slotDuration">
				<Multiselect
					:allow-empty="false"
					:options="slotDurationOptions"
					:value="selectedDurationOption"
					:disabled="savingSlotDuration"
					track-by="value"
					label="label"
					@select="changeSlotDuration" />
			</li>
			<SettingsTimezoneSelect :is-disabled="loadingCalendars" />
			<ActionButton class="settings-fieldset-interior-item" icon="icon-clippy" @click.prevent.stop="copyPrimaryCalDAV">
				{{ $t('calendar', 'Copy primary CalDAV address') }}
			</ActionButton>
			<ActionButton class="settings-fieldset-interior-item" icon="icon-clippy" @click.prevent.stop="copyAppleCalDAV">
				{{ $t('calendar', 'Copy iOS/macOS CalDAV address') }}
			</ActionButton>
			<ActionButton
				v-shortkey.propagate="['h']"
				class="settings-fieldset-interior-item"
				icon="icon-info"
				@click.prevent.stop="showKeyboardShortcuts"
				@shortkey.native="toggleKeyboardShortcuts">
				{{ $t('calendar', 'Show keyboard shortcuts') }}
			</ActionButton>
			<ShortcutOverview v-if="displayKeyboardShortcuts" @close="hideKeyboardShortcuts" />
		</ul>
	</AppNavigationSettings>
</template>

<script>
import ActionButton from '@nextcloud/vue/dist/Components/ActionButton'
import ActionCheckbox from '@nextcloud/vue/dist/Components/ActionCheckbox'
import AppNavigationSettings from '@nextcloud/vue/dist/Components/AppNavigationSettings'
import Multiselect from '@nextcloud/vue/dist/Components/Multiselect'
import {
	generateRemoteUrl,
} from '@nextcloud/router'
import {
	mapGetters,
	mapState,
} from 'vuex'
import moment from '@nextcloud/moment'
import {
	showSuccess,
	showError,
} from '@nextcloud/dialogs'

import SettingsImportSection from './Settings/SettingsImportSection.vue'
import SettingsTimezoneSelect from './Settings/SettingsTimezoneSelect.vue'

import { getCurrentUserPrincipal } from '../../services/caldavService.js'
import ShortcutOverview from './Settings/ShortcutOverview.vue'
import {
	IMPORT_STAGE_DEFAULT,
	IMPORT_STAGE_IMPORTING,
	IMPORT_STAGE_PROCESSING,
} from '../../models/consts.js'

export default {
	name: 'Settings',
	components: {
		ShortcutOverview,
		ActionButton,
		ActionCheckbox,
		AppNavigationSettings,
		Multiselect,
		SettingsImportSection,
		SettingsTimezoneSelect,
	},
	props: {
		loadingCalendars: {
			type: Boolean,
			default: false,
		},
	},
	data: function() {
		return {
			savingBirthdayCalendar: false,
			savingEventLimit: false,
			savingTasks: false,
			savingPopover: false,
			savingSlotDuration: false,
			savingWeekend: false,
			savingWeekNumber: false,
			displayKeyboardShortcuts: false,
		}
	},
	computed: {
		...mapGetters({
			birthdayCalendar: 'hasBirthdayCalendar',
		}),
		...mapState({
			eventLimit: state => state.settings.eventLimit,
			showPopover: state => !state.settings.skipPopover,
			showTasks: state => state.settings.showTasks,
			showWeekends: state => state.settings.showWeekends,
			showWeekNumbers: state => state.settings.showWeekNumbers,
			slotDuration: state => state.settings.slotDuration,
			timezone: state => state.settings.timezone,
			locale: (state) => state.settings.momentLocale,
		}),
		isBirthdayCalendarDisabled() {
			return this.savingBirthdayCalendar || this.loadingCalendars
		},
		files() {
			return this.$store.state.importFiles.importFiles
		},
		showUploadButton() {
			return this.$store.state.importState.importState.stage === IMPORT_STAGE_DEFAULT
		},
		showImportModal() {
			return this.$store.state.importState.importState.stage === IMPORT_STAGE_PROCESSING
		},
		showProgressBar() {
			return this.$store.state.importState.importState.stage === IMPORT_STAGE_IMPORTING
		},
		settingsTitle() {
			return this.$t('calendar', 'Settings & import').replace(/&amp;/g, '&')
		},
		slotDurationOptions() {
			return [{
				label: moment.duration(5 * 60 * 1000).locale(this.locale).humanize(),
				value: '00:05:00',
			}, {
				label: moment.duration(10 * 60 * 1000).locale(this.locale).humanize(),
				value: '00:10:00',
			}, {
				label: moment.duration(15 * 60 * 1000).locale(this.locale).humanize(),
				value: '00:15:00',
			}, {
				label: moment.duration(20 * 60 * 1000).locale(this.locale).humanize(),
				value: '00:20:00',
			}, {
				label: moment.duration(30 * 60 * 1000).locale(this.locale).humanize(),
				value: '00:30:00',
			}, {
				label: moment.duration(60 * 60 * 1000).locale(this.locale).humanize(),
				value: '01:00:00',
			}]
		},
		selectedDurationOption() {
			return this.slotDurationOptions.find(o => o.value === this.slotDuration)
		},
	},
	methods: {
		async toggleBirthdayEnabled() {
			// change to loading status
			this.savingBirthdayCalendar = true
			try {
				await this.$store.dispatch('toggleBirthdayCalendarEnabled')
				this.savingBirthdayCalendar = false
			} catch (error) {
				console.error(error)
				showError(this.$t('calendar', 'New setting was not saved successfully.'))
				this.savingBirthdayCalendar = false
			}
		},
		async toggleEventLimitEnabled() {
			// change to loading status
			this.savingEventLimit = true
			try {
				await this.$store.dispatch('toggleEventLimitEnabled')
				this.savingEventLimit = false
			} catch (error) {
				console.error(error)
				showError(this.$t('calendar', 'New setting was not saved successfully.'))
				this.savingEventLimit = false
			}
		},
		async toggleTasksEnabled() {
			// change to loading status
			this.savingTasks = true
			try {
				await this.$store.dispatch('toggleTasksEnabled')
				this.savingTasks = false
			} catch (error) {
				console.error(error)
				showError(this.$t('calendar', 'New setting was not saved successfully.'))
				this.savingTasks = false
			}
		},
		async togglePopoverEnabled() {
			// change to loading status
			this.savingPopover = true
			try {
				await this.$store.dispatch('togglePopoverEnabled')
				this.savingPopover = false
			} catch (error) {
				console.error(error)
				showError(this.$t('calendar', 'New setting was not saved successfully.'))
				this.savingPopover = false
			}
		},
		async toggleWeekendsEnabled() {
			// change to loading status
			this.savingWeekend = true
			try {
				await this.$store.dispatch('toggleWeekendsEnabled')
				this.savingWeekend = false
			} catch (error) {
				console.error(error)
				showError(this.$t('calendar', 'New setting was not saved successfully.'))
				this.savingWeekend = false
			}
		},
		/**
		 * Toggles the setting for "Show week number"
		 */
		async toggleWeekNumberEnabled() {
			// change to loading status
			this.savingWeekNumber = true
			try {
				await this.$store.dispatch('toggleWeekNumberEnabled')
				this.savingWeekNumber = false
			} catch (error) {
				console.error(error)
				showError(this.$t('calendar', 'New setting was not saved successfully.'))
				this.savingWeekNumber = false
			}
		},
		/**
		 * Updates the setting for slot duration
		 *
		 * @param {Object} option The new selected value
		 */
		async changeSlotDuration(option) {
			if (!option) {
				return
			}

			// change to loading status
			this.savingSlotDuration = true

			try {
				await this.$store.dispatch('setSlotDuration', {
					slotDuration: option.value,
				})
				this.savingSlotDuration = false
			} catch (error) {
				console.error(error)
				showError(this.$t('calendar', 'New setting was not saved successfully.'))
				this.savingSlotDuration = false
			}
		},
		/**
		 * Copies the primary CalDAV url to the user's clipboard.
		 */
		async copyPrimaryCalDAV() {
			try {
				await this.$copyText(generateRemoteUrl('dav'))
				showSuccess(this.$t('calendar', 'CalDAV link copied to clipboard.'))
			} catch (error) {
				console.debug(error)
				showError(this.$t('calendar', 'CalDAV link could not be copied to clipboard.'))
			}

		},
		/**
		 * Copies the macOS / iOS specific CalDAV url to the user's clipboard.
		 * This url is user-specific.
		 */
		async copyAppleCalDAV() {
			const rootURL = generateRemoteUrl('dav')
			const url = new URL(getCurrentUserPrincipal().principalUrl, rootURL)

			try {
				await this.$copyText(url)
				showSuccess(this.$t('calendar', 'CalDAV link copied to clipboard.'))
			} catch (error) {
				console.debug(error)
				showError(this.$t('calendar', 'CalDAV link could not be copied to clipboard.'))
			}
		},
		/**
		 * Show the keyboard shortcuts overview
		 */
		showKeyboardShortcuts() {
			this.displayKeyboardShortcuts = true
		},
		/**
		 * Hide the keyboard shortcuts overview
		 */
		hideKeyboardShortcuts() {
			this.displayKeyboardShortcuts = false
		},
		/**
		 * Toggles the keyboard shortcuts overview
		 */
		toggleKeyboardShortcuts() {
			this.displayKeyboardShortcuts = !this.displayKeyboardShortcuts
		},
	},
}
</script>
