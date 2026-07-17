import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
  // In a real application, this data would be fetched from the database
  const customers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active', joined: 'Aug 1, 2026' },
    { id: 2, name: 'Sarah Smith', email: 'sarah@example.com', status: 'Active', joined: 'Aug 3, 2026' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', status: 'Inactive', joined: 'Jul 28, 2026' },
  ]

  return (
    <div>
      <div className="dash-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="dash-title">Customers</h1>
            <p className="dash-subtitle">View and manage your customer database.</p>
          </div>
          <button className="btn-primary">Export CSV</button>
        </div>
      </div>

      <CustomersClient initialCustomers={customers} />
    </div>
  )
}
