import { useQuery, useMutation } from '@apollo/react-hooks'
import { makeStyles } from '@material-ui/core/styles'
import gql from 'graphql-tag'
import * as R from 'ramda'
import React, { useState, useEffect } from 'react'
import {
  AutoSizer,
  List,
  CellMeasurer,
  CellMeasurerCache
} from 'react-virtualized'

import ActionButton from 'src/components/buttons/ActionButton'
import { H5 } from 'src/components/typography'
import { ReactComponent as NotificationIconZodiac } from 'src/styling/icons/menu/notification-zodiac.svg'
import { ReactComponent as ClearAllIconInverse } from 'src/styling/icons/stage/spring/empty.svg'
import { ReactComponent as ClearAllIcon } from 'src/styling/icons/stage/zodiac/empty.svg'
import { ReactComponent as ShowUnreadIcon } from 'src/styling/icons/stage/zodiac/full.svg'

import styles from './NotificationCenter.styles'
import NotificationRow from './NotificationRow'

const useStyles = makeStyles(styles)

const GET_NOTIFICATIONS = gql`
  query getNotifications {
    notifications {
      id
      type
      detail
      message
      created
      read
      valid
    }
    hasUnreadNotifications
    machines {
      deviceId
      name
    }
  }
`

const TOGGLE_CLEAR_NOTIFICATION = gql`
  mutation toggleClearNotification($id: ID!, $read: Boolean!) {
    toggleClearNotification(id: $id, read: $read) {
      id
      read
    }
  }
`

const CLEAR_ALL_NOTIFICATIONS = gql`
  mutation clearAllNotifications {
    clearAllNotifications {
      id
    }
  }
`

const NotificationCenter = ({
  close,
  hasUnreadProp,
  buttonCoords,
  popperRef,
  refetchHasUnreadHeader
}) => {
  const { data, loading } = useQuery(GET_NOTIFICATIONS, {
    pollInterval: 60000
  })
  const [xOffset, setXoffset] = useState(300)

  const [showingUnread, setShowingUnread] = useState(false)
  const classes = useStyles({ buttonCoords, xOffset })
  const machines = R.compose(
    R.map(R.prop('name')),
    R.indexBy(R.prop('deviceId'))
  )(R.path(['machines'])(data) ?? [])
  const notifications = R.path(['notifications'])(data) ?? []
  const [hasUnread, setHasUnread] = useState(hasUnreadProp)

  const [toggleClearNotification] = useMutation(TOGGLE_CLEAR_NOTIFICATION, {
    onError: () => console.error('Error while clearing notification'),
    refetchQueries: () => ['getNotifications']
  })
  const [clearAllNotifications] = useMutation(CLEAR_ALL_NOTIFICATIONS, {
    onError: () => console.error('Error while clearing all notifications'),
    refetchQueries: () => ['getNotifications']
  })

  useEffect(() => {
    setXoffset(popperRef.current.getBoundingClientRect().x)
    if (data && data.hasUnreadNotifications !== hasUnread) {
      refetchHasUnreadHeader()
      setHasUnread(!hasUnread)
    }
  }, [popperRef, data, hasUnread, refetchHasUnreadHeader])

  const buildNotifications = () => {
    const notificationsToShow =
      !showingUnread || !hasUnread
        ? notifications
        : R.filter(R.propEq('read', false))(notifications)

    const cache = new CellMeasurerCache({
      defaultHeight: 58,
      fixedWidth: true
    })

    function rowRenderer({ index, key, parent, style }) {
      return (
        <CellMeasurer
          cache={cache}
          columnIndex={0}
          key={key}
          parent={parent}
          rowIndex={index}>
          {({ registerChild }) => (
            <div ref={registerChild} style={style}>
              <NotificationRow
                key={key}
                id={
                  notificationsToShow[index].id
                    ? notificationsToShow[index].id
                    : index
                }
                type={notificationsToShow[index].type}
                detail={notificationsToShow[index].detail}
                message={notificationsToShow[index].message}
                deviceName={
                  machines[notificationsToShow[index].detail.deviceId]
                }
                created={notificationsToShow[index].created}
                read={notificationsToShow[index].read}
                valid={notificationsToShow[index].valid}
                toggleClear={() =>
                  toggleClearNotification({
                    variables: {
                      id: notificationsToShow[index].id,
                      read: !notificationsToShow[index].read
                    }
                  })
                }
              />
            </div>
          )}
        </CellMeasurer>
      )
    }

    return (
      <AutoSizer>
        {({ height, width }) => (
          <List
            style={{ outline: 'none' }}
            height={loading ? 0 : height}
            width={loading ? 0 : width}
            rowCount={notificationsToShow.length}
            rowHeight={cache.rowHeight}
            rowRenderer={rowRenderer}
            overscanRowCount={5}
            deferredMeasurementCache={cache}
          />
        )}
      </AutoSizer>
    )
  }

  return (
    <>
      <div className={classes.container}>
        <div className={classes.header}>
          <H5 className={classes.headerText}>Notifications</H5>
          <button onClick={close} className={classes.notificationIcon}>
            <NotificationIconZodiac />
            {hasUnread && <div className={classes.hasUnread} />}
          </button>
        </div>
        <div className={classes.actionButtons}>
          {hasUnread && (
            <ActionButton
              color="primary"
              Icon={ShowUnreadIcon}
              InverseIcon={ClearAllIconInverse}
              className={classes.clearAllButton}
              onClick={() => setShowingUnread(!showingUnread)}>
              {showingUnread ? 'Show all' : 'Show unread'}
            </ActionButton>
          )}
          {hasUnread && (
            <ActionButton
              color="primary"
              Icon={ClearAllIcon}
              InverseIcon={ClearAllIconInverse}
              className={classes.clearAllButton}
              onClick={clearAllNotifications}>
              Mark all as read
            </ActionButton>
          )}
        </div>
        <div className={classes.notificationsList}>
          {!loading && buildNotifications()}
        </div>
      </div>
    </>
  )
}

export default NotificationCenter
